import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { useAuthStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import BackgroundBlobs from '@/components/3d/BackgroundBlobs';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useUIStore } from '@/store/useStore';

export default function RootLayout() {
  const { isAuthenticated, token, login, setHydrated } = useAuthStore();
  const { isSidebarOpen } = useUIStore();
  const location = useLocation();
  const [validating, setValidating] = useState(true);

  // On mount, validate stored token against the backend
  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setValidating(false);
        setHydrated(true);
        return;
      }
      try {
        const res = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = res.data;
        login(token, {
          employee_id: data.employee_id,
          email: data.email,
          role: data.role,
          name: data.full_name || data.email.split('@')[0],
        });
      } catch {
        // Token is invalid/expired — force logout silently
        useAuthStore.setState({ isAuthenticated: false, token: null, user: null });
      } finally {
        setValidating(false);
        setHydrated(true);
      }
    };
    validate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show loading spinner while validating token
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Validating session...</p>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  // If authenticated user tries to visit /login, send them to dashboard
  if (isAuthenticated && location.pathname === '/login') {
    return <Navigate to="/dashboard" replace />;
  }

  // Login page layout (no sidebar)
  if (location.pathname === '/login') {
    return (
      <div className="min-h-screen bg-slate-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E2E8F0]/30 to-[#93C5FD]/30" />
        <BackgroundBlobs />
        <main className="relative z-10 min-h-screen">
          <Outlet />
        </main>
      </div>
    );
  }

  // Main authenticated layout
  return (
    <div className="min-h-screen bg-[#E2E8F0]/30 flex relative overflow-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-blue-100/50 via-purple-50/50 to-teal-50/50 z-0" />
      <BackgroundBlobs />
      
      <Sidebar />
      
      <div className={cn(
        "flex-1 flex flex-col min-w-0 relative z-10 w-full transition-all duration-300 ease-in-out",
        isSidebarOpen ? "md:ml-[280px]" : "md:ml-[100px]"
      )}>
        <TopNav />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 md:px-6 pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mt-6 md:mt-8 max-w-[1600px] mx-auto w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
