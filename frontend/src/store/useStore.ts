import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'employee' | 'manager' | 'hr' | 'admin';

interface UserData {
  employee_id: string;
  email: string;
  role: UserRole;
  name: string;
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
      logout: () => {
        set({ isAuthenticated: false, token: null, user: null });
        // Clear query cache on logout to prevent stale data leaking
        window.location.href = '/login';
      },
      setHydrated: (v) => set({ isHydrated: v }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        token: state.token,
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
