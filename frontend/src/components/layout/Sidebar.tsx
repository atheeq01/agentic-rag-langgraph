import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  MessageSquareWarning,
  ClipboardList,
  FileText,
  Bot,
  Settings,
  LogOut,
  Shield,
  type LucideProps,
} from 'lucide-react';
import { useUIStore, useAuthStore, type UserRole } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';

type NavItem = {
  name: string;
  path: string;
  icon: React.FC<LucideProps>;
  roles?: UserRole[];
};

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard',          path: '/dashboard',        icon: LayoutDashboard },
  { name: 'My Leaves',          path: '/leaves',           icon: CalendarDays },
  { name: 'Manage Leaves',      path: '/leaves/manage',    icon: CalendarCheck,         roles: ['manager', 'hr', 'admin'] },
  { name: 'My Complaints',      path: '/complaints',       icon: MessageSquareWarning },
  { name: 'Manage Complaints',  path: '/complaints/manage',icon: ClipboardList,         roles: ['hr', 'admin'] },
  { name: 'Documents',          path: '/documents',        icon: FileText,              roles: ['hr', 'admin'] },
  { name: 'AI Chat',            path: '/ai-chat',          icon: Bot },
  { name: 'Settings',           path: '/settings',         icon: Settings },
];

export default function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── Icon Rail ─────────────────────────────────────────── */}
      <aside
        className={cn(
          // base
          "fixed inset-y-0 left-0 z-50 flex flex-col items-center py-5 gap-1",
          "bg-card border-r border-border",
          // width: 64px desktop always visible, mobile hidden unless open
          "w-16",
          // mobile: slide in/out
          "transition-transform duration-300",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Brand mark */}
        <div className="mb-4 flex flex-col items-center gap-1">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
            <Shield className="w-4 h-4" />
          </div>
        </div>

        {/* Divider */}
        <div className="w-8 h-px bg-border mb-2" />

        {/* Nav icons */}
        <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => { if (window.innerWidth < 768) toggleSidebar(); }}
                title={item.name}
                className={cn(
                  "relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="w-[18px] h-[18px]" />

                {/* Tooltip */}
                <span className={cn(
                  "absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap z-50",
                  "bg-foreground text-background shadow-lg",
                  "pointer-events-none opacity-0 group-hover:opacity-100",
                  "transition-opacity duration-150 -translate-y-1/2 top-1/2"
                )}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: user + logout */}
        <div className="flex flex-col items-center gap-2 w-full px-2">
          <div className="w-8 h-px bg-border" />

          {/* User avatar tooltip */}
          <div
            title={user?.name ?? ''}
            className="relative w-10 h-10 flex items-center justify-center group cursor-default"
          >
            <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <span className={cn(
              "absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap z-50",
              "bg-foreground text-background shadow-lg",
              "pointer-events-none opacity-0 group-hover:opacity-100",
              "transition-opacity duration-150 -translate-y-1/2 top-1/2"
            )}>
              {user?.name ?? 'Account'}<br/>
              <span className="opacity-60 font-normal capitalize">{user?.role}</span>
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            title="Logout"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 transition-all"
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>
        </div>
      </aside>
    </>
  );
}