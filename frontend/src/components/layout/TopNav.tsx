import { Menu, LogOut } from 'lucide-react';
import { useUIStore, useAuthStore } from '@/store/useStore';

export default function TopNav() {
  const { toggleSidebar } = useUIStore();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <header className="h-16 px-4 md:px-6 mt-2 md:mt-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-xl bg-white/60 border border-white/40 shadow-sm hover:bg-white transition-all md:hidden"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-5 h-5 text-primary" />
        </button>
        
        <div className="md:hidden flex items-center gap-2">
           <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-primary/20">A</div>
           <span className="font-black text-lg tracking-tighter text-slate-900 uppercase">ApexHR</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
        <div className="flex items-center gap-3 pl-2 sm:pl-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/80 to-purple-400 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            {initials}
          </div>
          {user && (
            <div className="hidden lg:flex flex-col">
              <span className="text-xs font-bold leading-tight text-slate-900">{user.name}</span>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{user.role}</span>
            </div>
          )}
          <button
            onClick={logout}
            title="Logout"
            className="p-2.5 rounded-xl hover:bg-rose-50 text-muted-foreground hover:text-rose-500 transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
