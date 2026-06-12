import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { useAuthStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useUIStore } from '@/store/useStore';

export default function RootLayout() {
  const { isAuthenticated, token, login, setHydrated } = useAuthStore();
  const { isSidebarOpen } = useUIStore();
  const location = useLocation();
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    const validate = async () => {
      if (!token) { setValidating(false); setHydrated(true); return; }
      try {
        const res = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        const data = res.data;
        login(token, {
          employee_id: data.employee_id,
          email: data.email,
          role: data.role,
          name: data.full_name || data.email.split('@')[0],
          annual_leave_balance: data.annual_leave_balance,
          sick_leave_balance: data.sick_leave_balance,
          maternity_leave_balance: data.maternity_leave_balance,
          paternity_leave_balance: data.paternity_leave_balance,
          bereavement_leave_balance: data.bereavement_leave_balance,
          unpaid_leave_balance: data.unpaid_leave_balance,
        });
      } catch {
        useAuthStore.setState({ isAuthenticated: false, token: null, user: null });
      } finally {
        setValidating(false);
        setHydrated(true);
      }
    };
    void validate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated && location.pathname === '/login') {
    return <Navigate to="/dashboard" replace />;
  }

  // Login / public pages — no shell
  if (location.pathname === '/login' || location.pathname === '/' ||
      location.pathname === '/privacy' || location.pathname === '/terms') {
    return (
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    );
  }

  // ── Main authenticated shell ──────────────────────────────
  return (
    <div className="min-h-screen bg-background flex">
      {/* 64px icon rail — always present on md+ */}
      <Sidebar />

      {/* Content column: offset by rail width on desktop */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-16">
        <TopNav />

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="max-w-[1440px] mx-auto w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
