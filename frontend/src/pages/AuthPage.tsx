import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Easing } from 'framer-motion';
import { Eye, EyeOff, Loader2, LogIn, UserPlus, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/useStore';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

const EASE: Easing = 'easeOut';

// ── Floating label input ──────────────────────────────────────
function FloatingInput({
  id, label, type, value, onChange, placeholder, required, autoComplete,
}: {
  id: string; label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  required?: boolean; autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  const isActive = focused || value.length > 0;
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={isActive ? placeholder : ''}
        required={required}
        autoComplete={autoComplete}
        className={`
          w-full bg-white dark:bg-secondary border rounded-xl px-4 pt-5 pb-2.5 text-sm
          text-foreground outline-none transition-all duration-200
          ${focused
            ? 'border-primary ring-2 ring-primary/15 shadow-sm'
            : 'border-border hover:border-primary/40'
          }
        `}
      />
      <label
        htmlFor={id}
        className={`
          absolute left-4 pointer-events-none transition-all duration-200 font-medium
          ${isActive
            ? 'top-2 text-[10px] text-primary'
            : 'top-1/2 -translate-y-1/2 text-sm text-muted-foreground'
          }
        `}
      >
        {label}
      </label>
    </div>
  );
}

// ── Password strength indicator ────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { label: '8+ chars', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Symbol', pass: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const colors = ['bg-rose-400', 'bg-amber-400', 'bg-emerald-400'];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < score ? colors[score - 1] : 'bg-border'}`} />
        ))}
      </div>
      <div className="flex gap-3">
        {checks.map(c => (
          <span key={c.label} className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${c.pass ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            <CheckCircle2 className="w-3 h-3" />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register' | 'force_reset'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [tempToken, setTempToken] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  // ── Mutations — all business logic unchanged ──────────────────
  const loginMutation = useMutation({
    mutationFn: async () => {
      const tokenRes = await api.post('/auth/login', { email, password });
      if (tokenRes.data.needs_password_reset) return { needsReset: true, token: tokenRes.data.access_token };
      const token = tokenRes.data.access_token;
      const userRes = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      return { token, user: userRes.data, needsReset: false };
    },
    onSuccess: (data: any) => {
      if (data.needsReset) { setTempToken(data.token); setMode('force_reset'); return; }
      login(data.token, {
        employee_id: data.user.employee_id, email: data.user.email, role: data.user.role,
        name: data.user.full_name || data.user.email.split('@')[0],
        annual_leave_balance: data.user.annual_leave_balance, sick_leave_balance: data.user.sick_leave_balance,
        maternity_leave_balance: data.user.maternity_leave_balance, paternity_leave_balance: data.user.paternity_leave_balance,
        bereavement_leave_balance: data.user.bereavement_leave_balance, unpaid_leave_balance: data.user.unpaid_leave_balance,
      });
      navigate('/dashboard');
    },
    onError: (err: any) => {
      const d = err.response?.data?.detail;
      setErrorMsg(typeof d === 'string' ? d : Array.isArray(d) ? d[0]?.msg : 'Login failed. Please check your credentials.');
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const tokenRes = await api.post('/auth/register', { email, password, full_name: fullName });
      const token = tokenRes.data.access_token;
      const userRes = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      return { token, user: userRes.data };
    },
    onSuccess: (data) => {
      login(data.token, {
        employee_id: data.user.employee_id, email: data.user.email, role: data.user.role,
        name: data.user.full_name || fullName || data.user.email.split('@')[0],
        annual_leave_balance: data.user.annual_leave_balance, sick_leave_balance: data.user.sick_leave_balance,
        maternity_leave_balance: data.user.maternity_leave_balance, paternity_leave_balance: data.user.paternity_leave_balance,
        bereavement_leave_balance: data.user.bereavement_leave_balance, unpaid_leave_balance: data.user.unpaid_leave_balance,
      });
      navigate('/dashboard');
    },
    onError: (err: any) => {
      const d = err.response?.data?.detail;
      setErrorMsg(typeof d === 'string' ? d : Array.isArray(d) ? d[0]?.msg : 'Registration failed. Please try again.');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/change-password', { old_password: password, new_password: newPassword },
        { headers: { Authorization: `Bearer ${tempToken}` } });
      const userRes = await api.get('/auth/me', { headers: { Authorization: `Bearer ${tempToken}` } });
      return { token: tempToken, user: userRes.data };
    },
    onSuccess: (data) => {
      login(data.token, {
        employee_id: data.user.employee_id, email: data.user.email, role: data.user.role,
        name: data.user.full_name || data.user.email.split('@')[0],
        annual_leave_balance: data.user.annual_leave_balance, sick_leave_balance: data.user.sick_leave_balance,
        maternity_leave_balance: data.user.maternity_leave_balance, paternity_leave_balance: data.user.paternity_leave_balance,
        bereavement_leave_balance: data.user.bereavement_leave_balance, unpaid_leave_balance: data.user.unpaid_leave_balance,
      });
      navigate('/dashboard');
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.detail || 'Failed to update password.'),
  });

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const validatePassword = (v: string) => {
    if (v.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(v)) return 'Must contain at least one uppercase letter.';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(v)) return 'Must contain at least one symbol.';
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (mode !== 'force_reset' && !validateEmail(email)) { setErrorMsg('Please enter a valid email address.'); return; }
    if (mode === 'login') {
      if (!password) { setErrorMsg('Password is required.'); return; }
      loginMutation.mutate();
    } else if (mode === 'register') {
      if (!fullName.trim()) { setErrorMsg('Full name is required.'); return; }
      const e = validatePassword(password);
      if (e) { setErrorMsg(e); return; }
      registerMutation.mutate();
    } else {
      const e = validatePassword(newPassword);
      if (e) { setErrorMsg(e); return; }
      changePasswordMutation.mutate();
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending || changePasswordMutation.isPending;

  const features = [
    { icon: '🗓️', title: 'Leave Management', sub: 'Smart, automated requests' },
    { icon: '🛡️', title: 'Secure Complaints', sub: 'End-to-end encrypted' },
    { icon: '🤖', title: 'AI Policy Retrieval', sub: 'RAG-powered answers' },
    { icon: '🔑', title: 'Google OAuth', sub: 'Zero-password security' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left brand panel (lg+) ─────────────────────────────── */}
      <div className="hidden lg:flex w-[440px] flex-shrink-0 bg-slate-950 flex-col relative overflow-hidden">
        {/* Animated gradient orb */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, hsl(14,90%,53%) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, hsl(14,90%,53%) 0%, transparent 70%)' }} />

        <div className="relative z-10 flex flex-col flex-1 p-12">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Apex HR</span>
          </div>

          {/* Center copy */}
          <div className="my-auto">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="text-4xl font-bold text-white leading-tight mb-4"
            >
              Smarter HR,<br />powered by AI.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
              className="text-white/50 text-sm leading-relaxed max-w-xs"
            >
              Enterprise-grade HR operations — leave management, secure complaints, and intelligent policy retrieval.
            </motion.p>

            {/* Feature grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
              className="mt-10 grid grid-cols-2 gap-3"
            >
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.07, ease: EASE }}
                  className="bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl p-3.5 transition-colors"
                >
                  <span className="text-lg">{f.icon}</span>
                  <p className="text-white text-xs font-semibold mt-2">{f.title}</p>
                  <p className="text-white/40 text-[10px] mt-0.5">{f.sub}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Footer note */}
          <p className="text-white/20 text-[10px] mt-auto">
            © 2026 Apex HR · Enterprise Edition
          </p>
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="w-full max-w-[400px]"
          >
            {/* Mobile brand */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="flex items-center gap-2 mb-8 lg:hidden"
            >
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-sm">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-bold text-foreground">Apex HR</span>
            </motion.div>

            {/* Heading */}
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-foreground mb-1">
                {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create account' : 'Reset password'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {mode === 'login'
                  ? 'Sign in to continue to your workspace.'
                  : mode === 'register'
                  ? 'Start managing HR with intelligence.'
                  : 'Your password has expired. Please set a new one.'}
              </p>
            </div>

            {/* Mode toggle */}
            {mode !== 'force_reset' && (
              <div className="flex bg-secondary rounded-xl p-1 mb-6 gap-1">
                {(['login', 'register'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setErrorMsg(''); }}
                    className={`
                      flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold
                      transition-all duration-200 flex items-center justify-center gap-2
                      ${mode === m
                        ? 'bg-card shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'}
                    `}
                  >
                    {m === 'login' ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                    {m === 'login' ? 'Sign in' : 'Register'}
                  </button>
                ))}
              </div>
            )}

            {/* Form */}
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
              <AnimatePresence mode="wait">
                {mode !== 'force_reset' ? (
                  <motion.div
                    key="normal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {mode === 'register' && (
                      <FloatingInput
                        id="fullName" label="Full Name" type="text"
                        value={fullName} onChange={setFullName}
                        placeholder="John Doe" required autoComplete="name"
                      />
                    )}
                    <FloatingInput
                      id="email" label="Work Email" type="email"
                      value={email} onChange={setEmail}
                      placeholder="you@company.com" required autoComplete="email"
                    />
                    <div>
                      <div className="relative">
                        <FloatingInput
                          id="password" label="Password"
                          type={showPassword ? 'text' : 'password'}
                          value={password} onChange={setPassword}
                          placeholder="••••••••" required
                          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {mode === 'register' && <PasswordStrength password={password} />}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="reset"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">Your password has expired. Please create a new one to continue.</p>
                    </div>
                    <div className="relative">
                      <FloatingInput
                        id="currentPwd" label="Current Password"
                        type={showPassword ? 'text' : 'password'}
                        value={password} onChange={setPassword}
                        placeholder="••••••••" required autoComplete="current-password"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div>
                      <div className="relative">
                        <FloatingInput
                          id="newPwd" label="New Password"
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword} onChange={setNewPassword}
                          placeholder="••••••••" required autoComplete="new-password"
                        />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1">
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <PasswordStrength password={newPassword} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error message */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    className="flex items-start gap-2.5 p-3.5 text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-xl overflow-hidden"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {errorMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isPending}
                className="
                  btn-primary w-full py-3.5 text-sm font-semibold
                  disabled:opacity-60 disabled:cursor-not-allowed
                  mt-2 relative overflow-hidden group
                "
              >
                {/* Shimmer on hover */}
                <span className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12 pointer-events-none" />
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {mode === 'login' ? 'Signing in…' : mode === 'register' ? 'Creating account…' : 'Updating…'}
                  </span>
                ) : (
                  mode === 'login' ? 'Sign in to Apex HR' : mode === 'register' ? 'Create account' : 'Update password'
                )}
              </button>
            </form>

            {/* Footer */}
            {mode === 'login' && (
              <p className="text-center text-xs text-muted-foreground mt-6">
                New to Apex HR?{' '}
                <button onClick={() => setMode('register')} className="text-primary font-semibold hover:underline">
                  Create an account
                </button>
              </p>
            )}
            {mode === 'register' && (
              <p className="text-center text-xs text-muted-foreground mt-6">
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-primary font-semibold hover:underline">
                  Sign in
                </button>
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
