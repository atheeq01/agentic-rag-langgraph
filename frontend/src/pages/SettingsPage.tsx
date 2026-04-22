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
  UserCog,
  Trash2,
  X,
  ChevronDown
} from 'lucide-react';
import { useAuthStore, hasRole } from '@/store/useStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

function AddUserModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'employee'
  });

  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/users/', data),
    onSuccess: () => {
      setStatus({ type: 'success', message: 'User created successfully!' });
      queryClient.invalidateQueries({ queryKey: ['users'] });

      setTimeout(() => {
        onClose();
        setStatus(null);
        setFormData({
          email: '',
          password: '',
          full_name: '',
          role: 'employee'
        });
      }, 1200);
    },
    onError: (error: any) => {
      setStatus({
        type: 'error',
        message:
          error.response?.data?.detail || 'Failed to create user.'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />

          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-900 rounded-lg">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-slate-900">Add New User</h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold text-sm"
                    value={formData.full_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="user@company.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold text-sm"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Temporary Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold text-sm"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">System Role</label>
                  <div className="relative">
                    <select
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer font-bold text-sm"
                      value={formData.role}
                      onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="hr">HR</option>
                      <option value="admin">Admin</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {status && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-3 rounded-xl flex items-center gap-2.5 text-[10px] font-black border uppercase tracking-widest",
                      status.type === 'success'
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-rose-50 text-rose-700 border-rose-100"
                    )}
                  >
                    {status.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    {status.message}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full py-3.5 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 uppercase text-xs tracking-widest shadow-xl shadow-slate-900/10"
                >
                  {mutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Create Account
                </button>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-rose-50 text-rose-700 border-rose-100',
  hr: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  manager: 'bg-purple-50 text-purple-700 border-purple-100',
  employee: 'bg-blue-50 text-blue-700 border-blue-100'
};

export default function SettingsPage() {
  const user = useAuthStore(state => state.user);
  const [activeTab, setActiveTab] = useState<'security' | 'team'>('security');
  const isAdmin = user?.role === 'admin';
  const isManagement = hasRole(user, 'admin', 'hr', 'manager');

  return (
    <div className="space-y-6 md:space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-sm md:text-base text-slate-500">
          Manage your account security and team permissions.
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-white/40 backdrop-blur-md border border-white/20 rounded-2xl w-fit max-w-full overflow-x-auto no-scrollbar">
        <TabButton
          active={activeTab === 'security'}
          onClick={() => setActiveTab('security')}
          icon={KeyRound}
          label="Account Security"
        />
        {isManagement && (
          <TabButton
            active={activeTab === 'team'}
            onClick={() => setActiveTab('team')}
            icon={Users}
            label="Team Management"
          />
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'security' ? (
            <SecurityTab />
          ) : (
            <TeamTab isAdmin={isAdmin} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}

function TabButton({ active, onClick, icon: Icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 text-xs md:text-sm font-bold whitespace-nowrap",
        active
          ? "bg-white text-primary shadow-sm ring-1 ring-slate-200"
          : "text-slate-500 hover:text-slate-900 hover:bg-white/40"
      )}
    >
      <Icon className={cn("w-4 h-4", active ? "text-primary" : "text-slate-400")} />
      {label}
    </button>
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
      api.patch('/users/me/password', data),
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      setStatus({ type: 'error', message: 'New passwords do not match.' });
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

function TeamTab({ isAdmin }: { isAdmin: boolean }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeRoleMenu, setActiveRoleMenu] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(res => res.data)
  });

  const promoteMutation = useMutation({
    mutationFn: (userId: string) => api.patch(`/users/${userId}/promote`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/users/${userId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setActiveRoleMenu(null);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/users/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  });

  return (
    <div className="space-y-6">
      <AddUserModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

      <div className="glass-panel overflow-hidden border border-white/40 shadow-2xl">
        <div className="p-5 md:p-6 border-b border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">User Management</h2>
              <p className="text-[10px] md:text-xs font-bold text-slate-400 italic">Manage employee roles and permissions.</p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 uppercase tracking-widest"
            >
              <UserPlus className="w-4 h-4" /> Add User
            </button>
          )}
        </div>

        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-white/40 text-left">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">User</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Role</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Status</th>
                {isAdmin && <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {isLoading ? (
                <tr><td colSpan={isAdmin ? 4 : 3} className="p-16 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
              ) : (
                users?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-white/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-white flex items-center justify-center text-slate-600 font-black text-xs shadow-sm">
                          {u.full_name ? u.full_name.substring(0, 2).toUpperCase() : '??'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-900 text-sm truncate">{u.full_name || 'Unnamed User'}</span>
                          <span className="text-[10px] font-bold text-slate-400 italic truncate">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black border uppercase tracking-widest", ROLE_STYLES[u.role] || ROLE_STYLES.employee)}>
                        <Shield className="w-3 h-3" /> {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className={cn("flex items-center justify-end gap-2 transition-all duration-200", activeRoleMenu === u.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                          {u.role === 'employee' && (
                            <button onClick={() => promoteMutation.mutate(u.id)} disabled={promoteMutation.isPending} className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white text-[9px] font-black rounded-lg hover:shadow-lg transition-all"><TrendingUp className="w-3 h-3" /> PROMOTE</button>
                          )}
                          <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setActiveRoleMenu(activeRoleMenu === u.id ? null : u.id); }} className={cn("p-2 rounded-xl border transition-all", activeRoleMenu === u.id ? "bg-slate-100 border-slate-200 text-primary" : "hover:bg-white border-transparent hover:border-slate-200 text-slate-600")}><UserCog className="w-4 h-4" /></button>
                            {activeRoleMenu === u.id && (
                              <div className="absolute right-0 top-full mt-2 z-50">
                                <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-1.5 min-w-[140px]">
                                  {(['employee', 'manager', 'hr', 'admin'] as const).map(r => (
                                    <button key={r} onClick={() => updateRoleMutation.mutate({ userId: u.id, role: r })} disabled={updateRoleMutation.isPending} className={cn("w-full text-left px-3 py-2.5 text-[10px] font-black rounded-xl hover:bg-slate-50 transition-colors uppercase flex items-center justify-between tracking-widest", u.role === r ? "text-primary bg-primary/5" : "text-slate-600")}>{r}{updateRoleMutation.isPending && updateRoleMutation.variables?.role === r && <Loader2 className="w-3 h-3 animate-spin" />}</button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={() => setUserToDelete(u)} 
                            disabled={deleteUserMutation.isPending || u.role === 'admin' || u.role === 'hr'} 
                            className={cn("p-2 rounded-xl border transition-all", u.role === 'admin' || u.role === 'hr' ? "opacity-30 cursor-not-allowed border-transparent text-slate-400" : "hover:bg-rose-50 border-transparent hover:border-rose-100 text-rose-600")}
                          >
                            {deleteUserMutation.isPending && deleteUserMutation.variables === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    )}
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
        message={`Are you sure you want to permanently delete ${userToDelete?.full_name || userToDelete?.email}? This action cannot be undone.`}
        confirmLabel="Delete User"
        onConfirm={() => {
          if (userToDelete) {
            deleteUserMutation.mutate(userToDelete.id, {
              onSuccess: () => setUserToDelete(null)
            });
          }
        }}
        onClose={() => setUserToDelete(null)}
        isLoading={deleteUserMutation.isPending}
        variant="danger"
      />
    </div>
  );
}