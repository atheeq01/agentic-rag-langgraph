import { Menu, LogOut, Sun, Moon, Bell } from 'lucide-react';
import { useUIStore, useAuthStore, useThemeStore } from '@/store/useStore';

export default function TopNav() {
  const { toggleSidebar } = useUIStore();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const { isDark, toggleTheme } = useThemeStore();

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="h-14 px-4 md:px-6 flex items-center justify-between gap-4 bg-card border-b border-border sticky top-0 z-30">
      {/* Left: mobile menu + greeting */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Greeting */}
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-foreground leading-none">
            {greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        {/* Dark mode */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors text-muted-foreground"
        >
          {isDark
            ? <Sun className="w-4 h-4 text-amber-400" />
            : <Moon className="w-4 h-4" />
          }
        </button>

        {/* Notification bell (placeholder) */}
        <button
          aria-label="Notifications"
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors text-muted-foreground relative"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* User chip */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          {user && (
            <div className="hidden md:flex flex-col leading-tight">
              <span className="text-xs font-semibold text-foreground">{user.name}</span>
              <span className="text-[10px] text-muted-foreground capitalize">{user.role}</span>
            </div>
          )}
          <button
            onClick={logout}
            title="Logout"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-all ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
