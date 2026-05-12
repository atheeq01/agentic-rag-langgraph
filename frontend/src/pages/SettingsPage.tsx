import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  KeyRound,
  Users,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  Trash2,
  X,
  Unlock,
  UserCheck,
  UserX,
  Edit2,
  Save
} from 'lucide-react';
import { useAuthStore, hasRole } from '@/store/useStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

// --- ADD USER MODAL ---
function AddUserModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'employee',
    password: 'String123@' // Hardcoded default password as requested
  });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string; } | null>(null);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/users/', data),
    onSuccess: () => {
      setStatus({ type: 'success', message: 'User created successfully!' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setTimeout(() => { 
        onClose(); 
        setStatus(null); 
        setFormData({ email: '', full_name: '', role: 'employee', password: 'String123@' }); 
      }, 1200);
    },
    onError: (error: any) => setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to create user.' })
  });

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3"><div className="p-2 bg-slate-900 rounded-lg"><UserPlus className="w-5 h-5 text-white" /></div><h3 className="font-bold text-slate-900">Add New User</h3></div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData); }} className="p-6 space-y-4 overflow-y-auto">
            
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 mb-2">
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest text-center">
                Default Password: <span className="text-slate-900 ml-1">String123@</span>
              </p>
            </div>

            <InputField label="Full Name" value={formData.full_name} onChange={(v: string) => setFormData(p => ({...p, full_name: v}))} placeholder="John Doe" />
            <InputField label="Email Address" type="email" value={formData.email} onChange={(v: string) => setFormData(p => ({...p, email: v}))} placeholder="user@company.com" />
            <SelectField label="System Role" value={formData.role} onChange={(v: string) => setFormData(p => ({...p, role: v}))} options={['employee', 'manager', 'hr', 'admin']} />
            
            {status && <StatusBadge type={status.type} message={status.message} />}
            <button type="submit" disabled={mutation.isPending} className="w-full py-3.5 mt-2 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Create Account
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

// --- EDIT USER MODAL ---
function EditUserModal({ isOpen, onClose, user, allUsers }: { isOpen: boolean; onClose: () => void; user: any; allUsers: any[] }) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state: any) => state.user);
  const [status, setStatus] = useState<{type: 'success'|'error', message: string} | null>(null);

  // Local form state so changes don't fire instantly
  const [editForm, setEditForm] = useState({
    role: '',
    department: '',
    manager_id: ''
  });

  // Sync state when a user is selected
  useEffect(() => {
    if (user) {
      setEditForm({
        role: user.role || 'employee',
        department: user.department || '',
        manager_id: user.manager_id || ''
      });
    }
  }, [user]);

  const updateAssignment = useMutation({
    mutationFn: (data: any) => api.patch(`/users/${user.id}/assign`, data)
  });

  const updateRole = useMutation({
    mutationFn: (role: string) => api.patch(`/users/${user.id}/role`, { role })
  });

  const toggleStatus = useMutation({
    mutationFn: () => api.patch(`/users/${user.id}/${user.is_active === false ? 'activate' : 'deactivate'}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  });

  const unlock = useMutation({
    mutationFn: () => api.post(`/auth/users/${user.id}/unlock`),
    onSuccess: () => setStatus({type: 'success', message: 'Account unlocked'})
  });

  // Master save function
  const handleSaveDetails = async () => {
    try {
      if (editForm.role !== user.role) {
        await updateRole.mutateAsync(editForm.role);
      }
      if (editForm.department !== user.department || editForm.manager_id !== user.manager_id) {
        await updateAssignment.mutateAsync({ department: editForm.department, manager_id: editForm.manager_id || null });
      }
      
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setStatus({type: 'success', message: 'User details updated successfully!'});
      setTimeout(() => { setStatus(null); onClose(); }, 1200);
    } catch (error) {
      setStatus({type: 'error', message: 'Failed to update details.'});
    }
  };

  if (!isOpen || !user) return null;

  const isSaving = updateRole.isPending || updateAssignment.isPending;

  return createPortal(
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110]" />
      <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-lg">
                {user.full_name?.substring(0,2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{user.full_name}</h3>
                <p className="text-xs text-slate-500 font-medium">{user.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <SelectField 
                label="System Role" 
                value={editForm.role} 
                onChange={(v: string) => setEditForm(p => ({ ...p, role: v }))} 
                options={['employee', 'manager', 'hr', 'admin']} 
              />
              
              <SelectField 
                label="Department" 
                value={editForm.department} 
                onChange={(v: string) => setEditForm(p => ({ ...p, department: v, manager_id: '' }))} // Clear manager when dept changes
                options={['', 'financial', 'operational', 'hr']} 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Assign To Manager</label>
              <select 
                value={editForm.manager_id} 
                onChange={(e) => setEditForm(p => ({ ...p, manager_id: e.target.value }))}
                className="custom-select w-full !py-3 !bg-slate-50 !border-slate-100"
              >
                <option value="">No Manager / Independent</option>
                {allUsers?.filter(m => 
                  m.id !== user.id && 
                  ['admin', 'manager', 'hr'].includes(m.role) &&
                  (editForm.department ? m.department === editForm.department : true) // Filters by local state department
                ).map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={handleSaveDetails}
              disabled={isSaving}
              className="w-full py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest mt-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Updates
            </button>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
               <ActionButton 
                onClick={() => toggleStatus.mutate()} 
                icon={user.is_active === false ? UserCheck : UserX} 
                label={user.is_active === false ? "Activate Account" : "Deactivate Account"} 
                color={user.is_active === false ? "emerald" : "amber"} 
                isLoading={toggleStatus.isPending}
                disabled={user.id === currentUser?.id}
               />
               <ActionButton 
                onClick={() => unlock.mutate()} 
                icon={Unlock} 
                label="Unlock Account" 
                color="blue" 
                isLoading={unlock.isPending}
               />
            </div>

            {status && <StatusBadge type={status.type} message={status.message} />}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

// --- MAIN PAGE COMPONENT ---
export default function SettingsPage() {
  const user = useAuthStore((state: any) => state.user);
  const [activeTab, setActiveTab] = useState<'security' | 'team'>('security');
  const isAdmin = user?.role === 'admin';
  const isManagement = hasRole(user, 'admin', 'hr', 'manager');

  return (
    <div className="space-y-6 md:space-y-8 max-w-6xl mx-auto p-4 md:p-0">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Manage your account security and team permissions.</p>
      </div>

      <div className="flex gap-1 p-1 bg-white/40 backdrop-blur-md border border-white/20 rounded-2xl w-fit">
        <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={KeyRound} label="Security" />
        {isManagement && <TabButton active={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={Users} label="Team" />}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          {activeTab === 'security' ? <SecurityTab /> : <TeamTab isAdmin={isAdmin} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function TeamTab({ isAdmin }: { isAdmin: boolean }) {
  const user = useAuthStore((state: any) => state.user);
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  });

  return (
    <div className="space-y-6">
      <AddUserModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <EditUserModal isOpen={!!userToEdit} onClose={() => setUserToEdit(null)} user={userToEdit} allUsers={users || []} />

      <div className="glass-panel overflow-hidden border border-white/40 shadow-2xl">
        <div className="p-6 border-b border-white/20 flex items-center justify-between bg-white/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600"><Users className="w-5 h-5" /></div>
            <h2 className="text-lg font-bold text-slate-900">User Management</h2>
          </div>
          {isAdmin && (
            <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest">
              <UserPlus className="w-4 h-4" /> Add User
            </button>
          )}
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 text-left">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Info</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={4} className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></td></tr>
              ) : (
                users?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs border border-white shadow-sm">
                          {u.full_name?.substring(0,2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm">{u.full_name}</span>
                          <span className="text-[10px] font-bold text-slate-400 italic">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                        u.is_active !== false ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"
                      )}>
                        {u.is_active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn("px-2 py-1 rounded-lg text-[9px] font-black border uppercase tracking-widest", ROLE_STYLES[u.role])}>{u.role}</span>
                        {u.department && <span className="px-2 py-1 rounded-lg text-[9px] font-black border border-slate-200 bg-white text-slate-500 uppercase tracking-widest">{u.department}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isAdmin && (
                          <>
                            <button onClick={() => setUserToEdit(u)} className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setUserToDelete(u)} 
                              disabled={u.role === 'admin' || u.role === 'hr'}
                              className={cn("p-2 rounded-xl transition-all", u.role === 'admin' || u.role === 'hr' ? "opacity-20" : "text-rose-400 hover:text-rose-600 hover:bg-rose-50")}
                            >
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
        message={`Delete ${userToDelete?.full_name}?`}
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
  admin: 'bg-rose-50 text-rose-700 border-rose-100',
  hr: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  manager: 'bg-purple-50 text-purple-700 border-purple-100',
  employee: 'bg-blue-50 text-blue-700 border-blue-100'
};

function InputField({ label, value, onChange, placeholder, type = "text" }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
      <input type={type} required placeholder={placeholder} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectField({ label, value, onChange, options, disabled }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
      <select disabled={disabled} className="custom-select w-full !py-2.5 !bg-slate-50 !border-slate-100 !px-4" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o: string) => <option key={o} value={o}>{o ? o.charAt(0).toUpperCase() + o.slice(1) : 'None'}</option>)}
      </select>
    </div>
  );
}

function ActionButton({ onClick, icon: Icon, label, color, isLoading, disabled }: any) {
  const colors: any = {
    emerald: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-100",
    amber: "text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-100",
    blue: "text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100",
    purple: "text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-100"
  };
  return (
    <button disabled={disabled || isLoading} onClick={onClick} className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-30", colors[color])}>
      {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

function StatusBadge({ type, message }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={cn("p-3 rounded-xl flex items-center gap-2.5 text-[10px] font-black border uppercase tracking-widest", type === 'success' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100")}>
      {type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {message}
    </motion.div>
  );
}

function SecurityTab() {
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const mutation = useMutation({
    mutationFn: (data: { old_password: string; new_password: string }) =>
      api.post('/auth/change-password', data),
    onSuccess: () => {
      setStatus({ type: 'success', message: 'Password updated successfully!' });
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setStatus(null), 5000);
    },
    onError: (error: any) => {
      setStatus({
        type: 'error',
        message: error.response?.data?.detail || 'Failed to update password.'
      });
    }
  });

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return "Password must contain at least one symbol.";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      setStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    const pwdError = validatePassword(passwordData.new_password);
    if (pwdError) {
      setStatus({ type: 'error', message: pwdError });
      return;
    }
    mutation.mutate({
      old_password: passwordData.old_password,
      new_password: passwordData.new_password
    });
  };

  return (
    <div className="glass-panel p-6 md:p-8 max-w-2xl border border-white/40 shadow-2xl">
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-tight border-0 shadow-none p-0">Change Password</h2>
          <p className="text-xs md:text-sm text-slate-500">
            Update your account credentials to stay secure.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Current Password</label>
          <input
            type="password"
            required
            className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
            value={passwordData.old_password}
            onChange={e => setPasswordData(prev => ({ ...prev, old_password: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">New Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
              value={passwordData.new_password}
              onChange={e => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Confirm New Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
              value={passwordData.confirm_password}
              onChange={e => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
            />
          </div>
        </div>

        {status && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "p-4 rounded-2xl flex items-center gap-3 border uppercase text-[10px] font-black tracking-widest",
              status.type === 'success'
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-rose-50 text-rose-700 border-rose-100"
            )}
          >
            {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            {status.message}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full md:w-auto px-10 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 disabled:opacity-50 uppercase text-xs tracking-widest"
        >
          {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Update Password
        </button>
      </form>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-xs font-bold whitespace-nowrap", active ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-900")}>
      <Icon className={cn("w-4 h-4", active ? "text-slate-900" : "text-slate-400")} /> {label}
    </button>
  );
}
