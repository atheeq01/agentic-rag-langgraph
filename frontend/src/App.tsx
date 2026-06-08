import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootLayout from '@/components/layout/RootLayout';
import AuthPage from '@/pages/AuthPage';
import DashboardPage from '@/pages/DashboardPage';
import MyLeavesPage from '@/pages/MyLeavesPage';
import ManageLeavesPage from '@/pages/ManageLeavesPage';
import MyComplaintsPage from '@/pages/MyComplaintsPage';
import ManageComplaintsPage from '@/pages/ManageComplaintsPage';
import DocumentsPage from '@/pages/DocumentsPage';
import AIChatPage from '@/pages/AIChatPage';
import SettingsPage from '@/pages/SettingsPage';
import PrivacyPolicy from '@/pages/PrivacyPolicy'; // New Import
import TermsOfService from '@/pages/TermsOfService'; // New Import
import LandingPage from '@/pages/LandingPage';
import { useAuthStore, type UserRole } from '@/store/useStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    }
  }
});

function RoleGate({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const user = useAuthStore(state => state.user);
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

import { Toaster } from 'sonner';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />

          <Route element={<RootLayout />}>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/leaves" element={<MyLeavesPage />} />
            <Route path="/leaves/manage" element={
              <RoleGate roles={['manager', 'hr', 'admin']}>
                <ManageLeavesPage />
              </RoleGate>
            } />
            <Route path="/complaints" element={<MyComplaintsPage />} />
            <Route path="/complaints/manage" element={
              <RoleGate roles={['hr', 'admin']}>
                <ManageComplaintsPage />
              </RoleGate>
            } />
            <Route path="/documents" element={
              <RoleGate roles={['hr', 'admin']}>
                <DocumentsPage />
              </RoleGate>
            } />
            <Route path="/ai-chat" element={<AIChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}