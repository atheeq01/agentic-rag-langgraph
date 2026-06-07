import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Bot, Loader2, UserPlus, LogIn } from 'lucide-react';
import { useAuthStore } from '@/store/useStore';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register' | 'force_reset'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [tempToken, setTempToken] = useState('');
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const tokenRes = await api.post('/auth/login', { email, password });
      if (tokenRes.data.needs_password_reset) {
        return { needsReset: true, token: tokenRes.data.access_token };
      }
      const token = tokenRes.data.access_token;
      const userRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { token, user: userRes.data, needsReset: false };
    },
    onSuccess: (data: any) => {
      if (data.needsReset) {
        setTempToken(data.token);
        setMode('force_reset');
        setPassword(''); // Clear it so they can type it in as "Current Password" if they want, or we could keep it. Let's keep it.
        return;
      }
      login(data.token, {
        employee_id: data.user.employee_id,
        email: data.user.email,
        role: data.user.role,
        name: data.user.full_name || data.user.email.split('@')[0],
        annual_leave_balance: data.user.annual_leave_balance,
        sick_leave_balance: data.user.sick_leave_balance,
        maternity_leave_balance: data.user.maternity_leave_balance,
        paternity_leave_balance: data.user.paternity_leave_balance,
        bereavement_leave_balance: data.user.bereavement_leave_balance,
        unpaid_leave_balance: data.user.unpaid_leave_balance
      });
      navigate('/dashboard');
    },
    onError: (err: any) => {
      // Extract the detailed message (e.g., "3 attempts remaining") from the backend
      const backendDetail = err.response?.data?.detail;
      
      if (typeof backendDetail === 'string') {
        setErrorMsg(backendDetail);
      } else if (Array.isArray(backendDetail)) {
        // Handles FastAPI validation error arrays
        setErrorMsg(backendDetail[0]?.msg || 'Authentication failed');
      } else {
        setErrorMsg('Login failed. Please check your credentials.');
      }
    }
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const tokenRes = await api.post('/auth/register', { email, password, full_name: fullName });
      const token = tokenRes.data.access_token;
      const userRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { token, user: userRes.data };
    },
    onSuccess: (data) => {
      login(data.token, {
        employee_id: data.user.employee_id,
        email: data.user.email,
        role: data.user.role,
        name: data.user.full_name || fullName || data.user.email.split('@')[0],
        annual_leave_balance: data.user.annual_leave_balance,
        sick_leave_balance: data.user.sick_leave_balance,
        maternity_leave_balance: data.user.maternity_leave_balance,
        paternity_leave_balance: data.user.paternity_leave_balance,
        bereavement_leave_balance: data.user.bereavement_leave_balance,
        unpaid_leave_balance: data.user.unpaid_leave_balance
      });
      navigate('/dashboard');
    },
    onError: (err: any) => {
      const backendDetail = err.response?.data?.detail;
      if (typeof backendDetail === 'string') {
        setErrorMsg(backendDetail);
      } else if (Array.isArray(backendDetail)) {
        setErrorMsg(backendDetail[0]?.msg || 'Registration failed');
      } else {
        setErrorMsg('Registration failed. Please try again.');
      }
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/change-password', 
        { old_password: password, new_password: newPassword },
        { headers: { Authorization: `Bearer ${tempToken}` } }
      );
      const userRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${tempToken}` }
      });
      return { token: tempToken, user: userRes.data };
    },
    onSuccess: (data) => {
      login(data.token, {
        employee_id: data.user.employee_id,
        email: data.user.email,
        role: data.user.role,
        name: data.user.full_name || data.user.email.split('@')[0],
        annual_leave_balance: data.user.annual_leave_balance,
        sick_leave_balance: data.user.sick_leave_balance,
        maternity_leave_balance: data.user.maternity_leave_balance,
        paternity_leave_balance: data.user.paternity_leave_balance,
        bereavement_leave_balance: data.user.bereavement_leave_balance,
        unpaid_leave_balance: data.user.unpaid_leave_balance
      });
      navigate('/dashboard');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Failed to update password. Please check your credentials.');
    }
  });

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return "Password must contain at least one symbol.";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!validateEmail(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (mode === 'login') {
      if (!password) {
        setErrorMsg('Password is required.');
        return;
      }
      loginMutation.mutate();
    } else if (mode === 'register') {
      if (!fullName.trim()) {
        setErrorMsg('Full name is required.');
        return;
      }
      const pwdError = validatePassword(password);
      if (pwdError) {
        setErrorMsg(pwdError);
        return;
      }
      registerMutation.mutate();
    } else if (mode === 'force_reset') {
      const pwdError = validatePassword(newPassword);
      if (pwdError) {
        setErrorMsg(pwdError);
        return;
      }
      changePasswordMutation.mutate();
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending || changePasswordMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10 w-full h-full">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[420px]"
      >
        <div className="glass-panel p-8 sm:p-10 relative">
          
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2">
              <Bot className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold tracking-tight">ApexHR</span>
            </div>
          </div>
          
          {/* Mode Toggle */}
          {mode !== 'force_reset' && (
            <div className="flex bg-white/40 border border-white/30 rounded-xl p-1 mb-8">
              <button 
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${mode === 'login' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LogIn className="w-4 h-4" /> LOGIN
              </button>
              <button 
                type="button"
                onClick={() => { setMode('register'); setErrorMsg(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${mode === 'register' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <UserPlus className="w-4 h-4" /> REGISTER
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode !== 'force_reset' ? (
              <>
                {mode === 'register' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-1.5"
                  >
                    <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider block">Full Name</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white/50 border border-white/40 focus:border-primary/50 focus:bg-white/80 transition-all rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
                      placeholder="John Doe"
                      required
                    />
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider block">Email</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/50 border border-white/40 focus:border-primary/50 focus:bg-white/80 transition-all rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
                    placeholder="user@company.com"
                    required
                  />
                </div>
                
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider block">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/50 border border-white/40 focus:border-primary/50 focus:bg-white/80 transition-all rounded-xl px-4 py-3 text-sm outline-none pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Update Password Required</h3>
                  <p className="text-sm text-slate-500 mt-1">Your password has expired. Please update it to continue.</p>
                </div>
                
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider block">Current Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/50 border border-white/40 focus:border-primary/50 focus:bg-white/80 transition-all rounded-xl px-4 py-3 text-sm outline-none pr-10"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider block">New Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white/50 border border-white/40 focus:border-primary/50 focus:bg-white/80 transition-all rounded-xl px-4 py-3 text-sm outline-none pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }}
                className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg"
              >
                {errorMsg}
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 bg-gradient-to-r from-[#4E65FF] to-[#92EFFD] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:opacity-90 transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
              {isPending 
                ? (mode === 'login' ? 'AUTHENTICATING...' : mode === 'register' ? 'CREATING ACCOUNT...' : 'UPDATING...') 
                : (mode === 'login' ? 'LOGIN' : mode === 'register' ? 'CREATE ACCOUNT' : 'UPDATE PASSWORD')
              }
            </button>
          </form>
          
          {/* Faux Code Snippet */}
          <motion.div 
            initial={{ opacity: 0, x: -20, rotate: -5 }}
            animate={{ opacity: 1, x: 0, rotate: -5 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="absolute -bottom-10 -left-16 bg-green-100/90 border border-green-200 p-4 rounded-xl shadow-lg backdrop-blur text-[10px] font-mono text-green-800 pointer-events-none hidden md:block"
          >
            <pre>
{`{
  "success": true,
  "data": {
    "access_token": "jwt",
    "token_type": "bearer"
  }
}`}
            </pre>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
