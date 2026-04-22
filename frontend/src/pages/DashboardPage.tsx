import { motion } from 'framer-motion';
import { Calendar, Flag, Users, MessageSquarePlus, FileText, Clock, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore, isManagerOrAbove, isHROrAdmin } from '@/store/useStore';

export default function DashboardPage() {
  const user = useAuthStore(state => state.user);

  const { data: myLeaves, isLoading: loadingLeaves } = useQuery({
    queryKey: ['leaves', 'me'],
    queryFn: () => api.get('/leaves/me').then(res => res.data)
  });

  const { data: teamLeaves, isLoading: loadingTeamLeaves } = useQuery({
    queryKey: ['leaves', 'team'],
    queryFn: () => api.get('/leaves/team?status=pending').then(res => res.data),
    enabled: isManagerOrAbove(user)
  });

  const { data: myComplaints, isLoading: loadingComplaints } = useQuery({
    queryKey: ['complaints', 'me'],
    queryFn: () => api.get('/complaints/me').then(res => res.data)
  });

  const leaveBalanceDays = 14 - (myLeaves?.filter((l: any) => l.status === 'approved').length || 0) * 2;
  const activeComplaintsCount = myComplaints?.filter((c: any) => c.status !== 'resolved').length || 0;
  const teamLeavesCount = teamLeaves?.length || 0;

  // Build quick actions based on role
  const quickActions = [
    { title: "APPLY LEAVE", icon: Calendar, color: "text-blue-500", path: "/leaves" },
    { title: "FILE COMPLAINT", icon: Flag, color: "text-rose-500", path: "/complaints" },
    { title: "CHAT WITH AI", icon: MessageSquarePlus, color: "text-purple-500", path: "/ai-chat" },
    ...(isHROrAdmin(user) ? [{ title: "MANAGE DOCUMENTS", icon: FileText, color: "text-teal-500", path: "/documents" }] : []),
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-slate-900 leading-none mb-1">MAIN DASHBOARD</h1>
          {user && (
            <p className="text-sm text-muted-foreground font-medium">
              Welcome back, <span className="text-slate-900 font-bold">{user.name}</span>
            </p>
          )}
        </div>
        {user && (
           <span className="w-fit text-[10px] bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider tabular-nums">
             {user.role} Account
           </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Leave Balance */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-5 md:p-6 flex flex-col justify-between group hover:border-primary/30 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">LEAVE BALANCE</p>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900">
                 {loadingLeaves ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <>{leaveBalanceDays} <span className="text-lg text-muted-foreground font-bold italic">DAYS</span></>}
              </h2>
            </div>
            <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
          <div className="mt-6">
            <Link to="/leaves" className="w-full sm:w-auto inline-flex items-center justify-center py-2.5 px-5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10">
              APPLY FOR LEAVE
            </Link>
          </div>
        </motion.div>

        {/* Active Complaints */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-5 md:p-6 flex flex-col justify-between group hover:border-rose-200 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">ACTIVE COMPLAINTS</p>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tabular-nums">
                 {loadingComplaints ? <Loader2 className="w-8 h-8 animate-spin text-rose-400" /> : activeComplaintsCount}
              </h2>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-400 group-hover:scale-110 transition-transform">
               <Flag className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
          <div className="mt-6 invisible">Placeholder</div>
        </motion.div>

        {/* Team Leaves — only for Manager/HR/Admin */}
        {isManagerOrAbove(user) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-5 md:p-6 flex flex-col justify-between group hover:border-purple-200 transition-colors sm:col-span-2 lg:col-span-1"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">PENDING TEAM LEAVES</p>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tabular-nums">
                   {loadingTeamLeaves ? <Loader2 className="w-8 h-8 animate-spin text-purple-400" /> : teamLeavesCount}
                </h2>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50 text-purple-400 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5 md:w-6 md:h-6" />
              </div>
            </div>
            <div className="mt-6">
              <Link to="/leaves/manage" className="w-full sm:w-auto inline-flex items-center justify-center py-2.5 px-5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/10">
                REVIEW REQUESTS
              </Link>
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">QUICK ACTIONS</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {quickActions.map((action, i) => (
            <Link key={i} to={action.path}>
              <motion.div 
                whileHover={{ y: -5 }}
                className="glass-panel p-5 md:p-6 flex flex-col items-center justify-center gap-4 text-center cursor-pointer hover:shadow-2xl hover:bg-white transition-all border border-transparent hover:border-primary/20"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-primary/5 flex items-center justify-center">
                  <action.icon className={`w-5 h-5 md:w-6 md:h-6 ${action.color}`} />
                </div>
                <span className="text-[10px] md:text-xs font-black tracking-widest uppercase text-slate-700">{action.title}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Team Leave Overview — Manager/HR/Admin */}
        {isManagerOrAbove(user) && (
          <div className="glass-panel overflow-hidden border border-white/40">
            <div className="p-5 border-b border-white/20 bg-white/30 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">TEAM LEAVE REQUESTS</h3>
              <Link to="/leaves/manage" className="text-[10px] font-bold text-primary hover:underline uppercase">View All</Link>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="bg-white/40">
                    <th className="py-3 px-5 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground italic">Employee</th>
                    <th className="py-3 px-5 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground italic">Dates</th>
                    <th className="py-3 px-5 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground italic">Type</th>
                    <th className="py-3 px-5 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground italic">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {loadingTeamLeaves && <tr><td colSpan={4} className="py-12 text-center text-primary"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>}
                  {!loadingTeamLeaves && teamLeaves?.length === 0 && <tr><td colSpan={4} className="py-12 text-center text-muted-foreground font-medium uppercase tracking-widest text-[10px]">No pending team leaves</td></tr>}
                  
                  {teamLeaves?.slice(0, 5).map((leave: any) => (
                     <tr key={leave.id} className="hover:bg-white/40 transition-colors group">
                       <td className="py-4 px-5">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-xs font-black text-primary">
                             {(leave.employee_id || '').substring(0, 2).toUpperCase()}
                           </div>
                           <span className="font-bold text-xs text-slate-700 truncate max-w-[120px]">{leave.employee_id}</span>
                         </div>
                       </td>
                       <td className="py-4 px-5 text-slate-500 text-[10px] font-bold italic">{leave.start_date} <br/> {leave.end_date}</td>
                       <td className="py-4 px-5 text-xs font-bold uppercase text-slate-600">{leave.leave_type}</td>
                       <td className="py-4 px-5">
                         <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100/50">
                           <Clock className="w-3 h-3" /> PENDING
                         </span>
                       </td>
                     </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* My Complaints */}
        <div className="glass-panel flex flex-col border border-white/40">
           <div className="p-5 border-b border-white/20 bg-white/30 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">MY RECENT COMPLAINTS</h3>
              <Link to="/complaints" className="text-[10px] font-bold text-primary hover:underline uppercase">History</Link>
          </div>
          <div className="p-5 flex-1 space-y-3">
            {loadingComplaints ? (
               <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : myComplaints?.length === 0 ? (
               <div className="py-12 text-center text-muted-foreground font-medium uppercase tracking-widest text-[10px]">No active complaints</div>
            ) : (
               myComplaints?.slice(0, 3).map((comp: any) => (
                  <div key={comp.id} className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/60 hover:border-primary/20 transition-all group">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em]">Complaint ID: {comp.id.substring(0,6)}</span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${comp.status === 'resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${comp.status === 'resolved' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`}></span> {comp.status}
                        </span>
                     </div>
                     <p className="font-bold text-sm text-slate-800 group-hover:text-primary transition-colors">{comp.title}</p>
                  </div>
               ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
