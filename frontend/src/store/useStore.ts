import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

export type UserRole = 'employee' | 'manager' | 'hr' | 'admin';

interface UserData {
  employee_id: string;
  email: string;
  role: UserRole;
  name: string;
  annual_leave_balance?: number;
  sick_leave_balance?: number;
  maternity_leave_balance?: number;
  paternity_leave_balance?: number;
  bereavement_leave_balance?: number;
  unpaid_leave_balance?: number;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: UserData | null;
  isHydrated: boolean;
  login: (token: string, user: UserData) => void;
  logout: () => void;
  setHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,
      user: null,
      isHydrated: false,
      login: (token, user) => set({ isAuthenticated: true, token, user }),
      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (e) {
          console.error("Logout failed", e);
        }
        set({ isAuthenticated: false, token: null, user: null });
      },
      setHydrated: (v) => set({ isHydrated: v }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);

// Role helpers — always compare with exact API casing
export function hasRole(user: UserData | null, ...roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export function isManagerOrAbove(user: UserData | null): boolean {
  return hasRole(user, 'manager', 'hr', 'admin');
}

export function isHROrAdmin(user: UserData | null): boolean {
  return hasRole(user, 'hr', 'admin');
}

interface UIState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

// ─── Theme Store ──────────────────────────────────────────────────────────────
interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: false,
      toggleTheme: () => {
        const next = !get().isDark;
        set({ isDark: next });
        document.documentElement.classList.toggle('dark', next);
      },
    }),
    { name: 'theme-storage' }
  )
);

// Apply persisted theme on first load
const saved = localStorage.getItem('theme-storage');
if (saved) {
  try {
    const { state } = JSON.parse(saved);
    if (state?.isDark) document.documentElement.classList.add('dark');
  } catch {}
}
