import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Bot, Loader2, UserPlus, LogIn } from 'lucide-react';
import { useAuthStore } from '@/store/useStore';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const tokenRes = await api.post('/auth/login', { email, password });
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
        name: data.user.full_name || data.user.email.split('@')[0]
      });
      navigate('/dashboard');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Login failed. Please check your credentials.');
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
        name: data.user.full_name || fullName || data.user.email.split('@')[0]
      });
      navigate('/dashboard');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Registration failed. Please try again.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (mode === 'login') {
      loginMutation.mutate();
    } else {
      if (!fullName.trim()) {
        setErrorMsg('Full name is required.');
        return;
      }
      registerMutation.mutate();
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

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
          <div className="flex bg-white/40 border border-white/30 rounded-xl p-1 mb-8">
            <button 
              onClick={() => { setMode('login'); setErrorMsg(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${mode === 'login' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LogIn className="w-4 h-4" /> LOGIN
            </button>
            <button 
              onClick={() => { setMode('register'); setErrorMsg(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${mode === 'register' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <UserPlus className="w-4 h-4" /> REGISTER
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                ? (mode === 'login' ? 'AUTHENTICATING...' : 'CREATING ACCOUNT...') 
                : (mode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT')
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
