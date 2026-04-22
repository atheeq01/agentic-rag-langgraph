import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Calendar, 
  MessageSquareWarning, 
  FileText, 
  Bot, 
  Settings, 
  LogOut, 
  Shield,
  X
} from 'lucide-react';
import { useUIStore, useAuthStore, type UserRole } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';

type NavItem = {
  name: string;
  path: string;
  icon: any;
  roles?: UserRole[];
};

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'My Leaves', path: '/leaves', icon: Calendar },
  { name: 'Manage Leaves', path: '/leaves/manage', icon: Calendar, roles: ['manager', 'hr', 'admin'] },
  { name: 'My Complaints', path: '/complaints', icon: MessageSquareWarning },
  { name: 'Manage Complaints', path: '/complaints/manage', icon: MessageSquareWarning, roles: ['hr', 'admin'] },
  { name: 'Documents', path: '/documents', icon: FileText, roles: ['hr', 'admin'] },
  { name: 'AI Chat', path: '/ai-chat', icon: Bot },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const ROLE_COLORS: Record<string, string> = {
  employee: 'bg-blue-500/20 text-blue-700',
  manager: 'bg-purple-500/20 text-purple-700',
  hr: 'bg-emerald-500/20 text-emerald-700',
  admin: 'bg-rose-500/20 text-rose-700',
};

export default function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const currentlyMobile = window.innerWidth < 768;
      
      // If we are moving from mobile to desktop, and the sidebar is closed, force it open
      if (isMobile && !currentlyMobile && !isSidebarOpen) {
        toggleSidebar();
      }
      
      setIsMobile(currentlyMobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, isSidebarOpen, toggleSidebar]);

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
      {/* Mobile Overlay backdrop */}
      <AnimatePresence>
        {isSidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[40] md:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          width: isSidebarOpen ? 260 : (isMobile ? 260 : 80),
          x: isSidebarOpen ? 0 : (isMobile ? "-110%" : 0),
        }}
        transition={{ duration: 0.3 }}
        className={cn(
          "h-[calc(100vh-2rem)] rounded-3xl glass-panel flex flex-col overflow-hidden shrink-0 z-50",
          "fixed inset-y-0 left-0 m-4 border-white/50 shadow-2xl"
        )}
      >
        <div className="p-6 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            {isSidebarOpen && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="font-black text-xl tracking-tighter text-slate-900 uppercase"
              >
                ApexHR
              </motion.span>
            )}
          </div>
          <button onClick={toggleSidebar} className="md:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto no-scrollbar">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (isMobile) toggleSidebar();
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300",
                  isActive 
                    ? "bg-white/60 text-primary shadow-sm font-bold" 
                    : "text-foreground/70 hover:bg-white/40 hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : "text-foreground/50")} />
                {isSidebarOpen && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
        
        {/* User Profile + Logout */}
        <div className="p-4 mt-auto border-t border-white/20">
          {isSidebarOpen && user && (
            <div className="p-3 rounded-xl bg-white/40 border border-white/20 flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-purple-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate">{user.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full w-fit font-bold flex items-center gap-1 ${ROLE_COLORS[user.role] || ROLE_COLORS.employee}`}>
                  <Shield className="w-3 h-3" />
                  {user.role.toUpperCase()}
                </span>
              </div>
            </div>
          )}
          
          <button
            onClick={logout}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 text-rose-500 hover:bg-rose-50/60 w-full",
              !isSidebarOpen && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-bold text-sm">Logout</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
}