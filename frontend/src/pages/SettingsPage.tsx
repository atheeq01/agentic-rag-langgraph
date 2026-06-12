import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Easing } from 'framer-motion';
import {
  Shield, KeyRound, Users, UserPlus, CheckCircle2,
  AlertCircle, Loader2, Trash2, X, Unlock, UserCheck,
  UserX, Edit2, Save
} from 'lucide-react';
import { useAuthStore, hasRole } from '@/store/useStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

const EASE: Easing = 'easeOut';
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: EASE },
});

// --- ADD USER MODAL ---
function AddUserModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    email: '', full_name: '', role: 'employee', password: 'String123@'
  });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string; } | null>(null);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/users/', data),
    onSuccess: async () => {
      setStatus({ type: 'success', message: 'User created successfully!' });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setTimeout(() => { 
        onClose(); 
        setStatus(null); 
        setFormData({ email: '', full_name: '', role: 'employee', password: 'String123@' }); 
      }, 1200);
    },
    onError: (error: any) => setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to create user.' })
  });

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New User" maxWidth="md">
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData); }} className="space-y-4">
        
        <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 mb-2">
          <p className="text-xs text-primary font-semibold text-center">
            Default Password: <span className="text-foreground ml-1">String123@</span>
          </p>
        </div>

        <InputField label="Full Name" value={formData.full_name} onChange={(v: string) => setFormData(p => ({...p, full_name: v}))} placeholder="John Doe" />
        <InputField label="Email Address" type="email" value={formData.email} onChange={(v: string) => setFormData(p => ({...p, email: v}))} placeholder="user@company.com" />
        <Select 
          label="System Role" 
          value={formData.role} 
          onChange={(v: string) => setFormData(p => ({...p, role: v}))} 
          options={['employee', 'manager', 'hr', 'admin'].map(o => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))} 
        />
        
        {status && <StatusBadge type={status.type} message={status.message} />}
        <button type="submit" disabled={mutation.isPending} className="btn-primary w-full py-3 mt-2 flex items-center justify-center gap-2">
          {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Create Account
        </button>
      </form>
    </Modal>
  );
}

// --- EDIT USER MODAL ---
function EditUserModal({ isOpen, onClose, user, allUsers }: { isOpen: boolean; onClose: () => void; user: any; allUsers: any[] }) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state: any) => state.user);
  const [status, setStatus] = useState<{type: 'success'|'error', message: string} | null>(null);
  const [editForm, setEditForm] = useState({ role: '', department: '', manager_id: '' });

  useEffect(() => {
    if (user) {
      setEditForm({ role: user.role || 'employee', department: user.department || '', manager_id: user.manager_id || '' });
    }
  }, [user]);

  const updateAssignment = useMutation({ mutationFn: (data: any) => api.patch(`/users/${user.id}/assign`, data) });
  const updateRole = useMutation({ mutationFn: (role: string) => api.patch(`/users/${user.id}/role`, { role }) });
  
  const toggleStatus = useMutation({
    mutationFn: () => api.patch(`/users/${user.id}/${user.is_active === false ? 'activate' : 'deactivate'}`),
    onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['users'] })
  });

  const unlock = useMutation({
    mutationFn: () => api.post(`/auth/users/${user.id}/unlock`),
    onSuccess: () => setStatus({type: 'success', message: 'Account unlocked'})
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => api.patch(`/users/${user.id}/reset-password`, { new_password: 'String123@' }),
    onSuccess: () => setStatus({type: 'success', message: 'Password reset to default: String123@'}),
    onError: (err: any) => setStatus({type: 'error', message: err.response?.data?.detail || 'Failed to reset password'})
  });

  const handleSaveDetails = async () => {
    try {
      if (editForm.role !== user.role) await updateRole.mutateAsync(editForm.role);
      if (editForm.department !== user.department || editForm.manager_id !== user.manager_id) {
        await updateAssignment.mutateAsync({ department: editForm.department, manager_id: editForm.manager_id || null });
      }
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setStatus({type: 'success', message: 'User details updated successfully!'});
      setTimeout(() => { setStatus(null); onClose(); }, 1200);
    } catch (error) {
      setStatus({type: 'error', message: 'Failed to update details.'});
    }
  };

  if (!isOpen || !user) return null;

  const isSaving = updateRole.isPending || updateAssignment.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user.full_name} description={user.email} maxWidth="lg">
      <div className="space-y-5 pb-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 z-20">
          <Select 
            label="System Role" 
            value={editForm.role} 
            onChange={(v: string) => setEditForm(p => ({ ...p, role: v }))} 
            options={['employee', 'manager', 'hr', 'admin'].map(o => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))} 
          />
          <Select 
            label="Department" 
            value={editForm.department} 
            onChange={(v: string) => setEditForm(p => ({ ...p, department: v, manager_id: '' }))} 
            options={[
              { value: '', label: 'None' },
              { value: 'financial', label: 'Financial' },
              { value: 'operational', label: 'Operational' },
              { value: 'hr', label: 'HR' }
            ]} 
          />
        </div>

        <div className="z-10 relative">
          <Select 
            label="Assign To Manager" 
            value={editForm.manager_id} 
            onChange={(v: string) => setEditForm(p => ({ ...p, manager_id: v }))} 
            options={[
              { value: '', label: 'No Manager / Independent' },
              ...(allUsers?.filter(m => m.id !== user.id && ['admin', 'manager', 'hr'].includes(m.role) && (editForm.department ? m.department === editForm.department : true))
                .map(m => ({ value: m.id, label: m.full_name })) || [])
            ]}
          />
        </div>

        <button onClick={handleSaveDetails} disabled={isSaving} className="btn-primary w-full py-3 flex items-center justify-center gap-2 mt-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Updates
        </button>

        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            <ActionButton onClick={() => toggleStatus.mutate()} icon={user.is_active === false ? UserCheck : UserX} label={user.is_active === false ? "Activate" : "Deactivate"} color={user.is_active === false ? "emerald" : "amber"} isLoading={toggleStatus.isPending} disabled={user.id === currentUser?.id} />
            <ActionButton onClick={() => unlock.mutate()} icon={Unlock} label="Unlock" color="blue" isLoading={unlock.isPending} />
            {currentUser?.role === 'admin' && (
              <ActionButton onClick={() => resetPasswordMutation.mutate()} icon={KeyRound} label="Reset Password" color="rose" isLoading={resetPasswordMutation.isPending} />
            )}
        </div>

        {status && <StatusBadge type={status.type} message={status.message} />}
      </div>
    </Modal>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function SettingsPage() {
  const user = useAuthStore((state: any) => state.user);
  const [activeTab, setActiveTab] = useState<'security' | 'team'>('security');
  const isAdmin = user?.role === 'admin';
  const isManagement = hasRole(user, 'admin', 'hr', 'manager');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div {...fadeUp()}>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account security and team permissions.</p>
      </motion.div>

      <motion.div {...fadeUp(0.05)} className="flex gap-1 p-1 bg-secondary rounded-xl w-fit">
        <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={KeyRound} label="Security" />
        {isManagement && <TabButton active={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={Users} label="Team" />}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25, ease: EASE }}>
          {activeTab === 'security' ? <SecurityTab /> : <TeamTab isAdmin={isAdmin} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function TeamTab({ isAdmin }: { isAdmin: boolean }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users/').then((res: any) => res.data)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['users'] })
  });

  return (
    <div className="space-y-6">
      <AddUserModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <EditUserModal isOpen={!!userToEdit} onClose={() => setUserToEdit(null)} user={userToEdit} allUsers={users || []} />

      <div className="table-wrapper">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Users className="w-4 h-4" /></div>
            <h2 className="text-sm font-semibold text-foreground">User Management</h2>
          </div>
          {isAdmin && (
            <button onClick={() => setIsAddModalOpen(true)} className="btn-primary py-2 px-3 text-xs flex items-center gap-2">
              <UserPlus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add User</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50">
                <th className="table-header py-2.5 px-5 text-left">Employee</th>
                <th className="table-header py-2.5 px-5 text-center">Status</th>
                <th className="table-header py-2.5 px-5 text-left">Role & Dept</th>
                <th className="table-header py-2.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></td></tr>
              ) : (
                users?.map((u: any) => (
                  <tr key={u.id} className="table-row">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary text-foreground font-semibold text-xs flex items-center justify-center flex-shrink-0">
                          {u.full_name?.substring(0,2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{u.full_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-center">
                      <span className={`badge ${u.is_active !== false ? 'badge-approved' : 'badge-pending'}`}>
                        {u.is_active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${ROLE_STYLES[u.role] || 'bg-secondary text-foreground'}`}>{u.role}</span>
                        {u.department && <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{u.department}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <>
                            <button onClick={() => setUserToEdit(u)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setUserToDelete(u)} disabled={u.role === 'admin' || u.role === 'hr'}
                              className={`p-1.5 rounded-lg transition-colors ${u.role === 'admin' || u.role === 'hr' ? 'opacity-30 cursor-not-allowed' : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10'}`}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!userToDelete}
        title="Delete User"
        message={`Are you sure you want to delete ${userToDelete?.full_name}?`}
        onConfirm={() => deleteMutation.mutate(userToDelete.id, { onSuccess: () => setUserToDelete(null) })}
        onClose={() => setUserToDelete(null)}
        isLoading={deleteMutation.isPending}
        variant="danger"
      />
    </div>
  );
}

// --- HELPER COMPONENTS ---
const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600',
  hr: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600',
  manager: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600',
  employee: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600'
};

function InputField({ label, value, onChange, placeholder, type = "text" }: any) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-muted-foreground">{label}</label>
      <input type={type} required placeholder={placeholder} className="input w-full" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}


function ActionButton({ onClick, icon: Icon, label, color, isLoading, disabled }: any) {
  const colors: any = {
    emerald: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20",
    amber: "text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20",
    blue: "text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20",
    rose: "text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20"
  };
  return (
    <button disabled={disabled || isLoading} onClick={onClick} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40", colors[color])}>
      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

function StatusBadge({ type, message }: any) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} 
      className={cn("p-3 rounded-xl flex items-center gap-2 text-sm font-medium", type === 'success' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive")}>
      {type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {message}
    </motion.div>
  );
}

function SecurityTab() {
  const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string; } | null>(null);

  const mutation = useMutation({
    mutationFn: (data: { old_password: string; new_password: string }) => api.post('/auth/change-password', data),
    onSuccess: () => {
      setStatus({ type: 'success', message: 'Password updated successfully!' });
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setStatus(null), 5000);
    },
    onError: (error: any) => setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to update password.' })
  });

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return "Password must contain at least one symbol.";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) return setStatus({ type: 'error', message: 'New passwords do not match.' });
    const pwdError = validatePassword(passwordData.new_password);
    if (pwdError) return setStatus({ type: 'error', message: pwdError });
    mutation.mutate({ old_password: passwordData.old_password, new_password: passwordData.new_password });
  };

  return (
    <div className="card p-6 md:p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Change Password</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Update your account credentials to stay secure.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-muted-foreground">Current Password</label>
          <input type="password" required className="input w-full" value={passwordData.old_password} onChange={e => setPasswordData(prev => ({ ...prev, old_password: e.target.value }))} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-muted-foreground">New Password</label>
            <input type="password" required className="input w-full" value={passwordData.new_password} onChange={e => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-muted-foreground">Confirm New Password</label>
            <input type="password" required className="input w-full" value={passwordData.confirm_password} onChange={e => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))} />
          </div>
        </div>

        <AnimatePresence>
          {status && <StatusBadge type={status.type} message={status.message} />}
        </AnimatePresence>

        <button type="submit" disabled={mutation.isPending} className="btn-primary w-full py-3 flex items-center justify-center gap-2 mt-2">
          {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Update Password
        </button>
      </form>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
      <Icon className="w-4 h-4" /> <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
