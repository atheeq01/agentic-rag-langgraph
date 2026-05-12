import { useState } from 'react';
import { CheckCircle2, Loader2, Flag } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TeamComplaint {
  id: string;
  user_id: string;
  title: string;
  department: string;
  description: string;
  status: string;
  is_anonymous: boolean;
  reporter_name?: string;
}

export default function ManageComplaintsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: teamComplaints, isLoading: loadingTeam } = useQuery<TeamComplaint[]>({
    queryKey: ['complaints', 'team'],
    queryFn: () => api.get('/complaints/team?status=pending').then(res => res.data),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/complaints/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', 'team'] });
    }
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="px-1">
        <h1 className="text-3xl font-bold text-slate-900 leading-tight">Grievance Resolutions</h1>
        <p className="text-slate-500">Review and resolve employee concerns.</p>
      </div>

      <div className="glass-panel overflow-hidden border border-white/40 shadow-2xl rounded-3xl bg-white/30 backdrop-blur-md">
        <div className="p-6 border-b border-white/20 flex items-center gap-3">
          <div className="p-3 bg-rose-50 rounded-2xl text-rose-600"><Flag className="w-6 h-6" /></div>
          <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Active Cases</h2>
        </div>

        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="bg-white/40 text-left border-b border-white/10">
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Reporter</th>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic hidden sm:table-cell">Subject</th>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Description</th>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loadingTeam ? (
                <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-50" /></td></tr>
              ) : !Array.isArray(teamComplaints) || teamComplaints.length === 0 ? (
                <tr><td colSpan={4} className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">No pending grievances</td></tr>
              ) : (
                teamComplaints.map((comp) => (
                  <tr key={comp.id} className="hover:bg-white/40 transition-colors align-top">
                    <td className="py-4 px-4 md:px-6">
                      <div className="flex items-center gap-2 mt-1">
                        <div className={cn(
                          "w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black",
                          comp.is_anonymous ? "bg-slate-100 text-slate-400" : "bg-primary/10 text-primary"
                        )}>
                          {comp.is_anonymous ? "?" : (comp.reporter_name?.substring(0, 1) || "U")}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-sm leading-none mb-1">
                            {comp.is_anonymous ? "Anonymous" : comp.reporter_name}
                          </span>
                          {!comp.is_anonymous && (
                            <span className="text-[10px] font-bold text-slate-400 italic">ID: {comp.id.substring(0, 8)}</span>
                          )}
                          {/* Subject on mobile underneath the reporter */}
                          <span className="sm:hidden text-[10px] font-black text-slate-800 uppercase tracking-tight mt-2">{comp.title}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 md:px-6 font-black text-slate-800 text-[10px] uppercase tracking-tight hidden sm:table-cell mt-1">
                      <div className="mt-2">{comp.title}</div>
                    </td>
                    <td className="py-4 px-4 md:px-6 w-full max-w-[200px] md:max-w-sm">
                      <div 
                        className={cn(
                          "text-xs text-slate-600 leading-relaxed cursor-pointer transition-all mt-1",
                          expandedId === comp.id ? "whitespace-pre-wrap" : "line-clamp-2"
                        )}
                        onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)}
                      >
                        {comp.description}
                      </div>
                      {(comp.description?.length || 0) > 60 && (
                        <span 
                          className="inline-block cursor-pointer text-[9px] font-black text-rose-500 mt-1 uppercase tracking-tighter"
                          onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)}
                        >
                          {expandedId === comp.id ? "Close Details" : "View Full Description"}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 md:px-6 text-right">
                      <button onClick={() => resolveMutation.mutate(comp.id)} disabled={resolveMutation.isPending} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 border border-emerald-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ml-auto shadow-sm active:scale-[0.98] transition-all mt-1">
                        {resolveMutation.isPending && resolveMutation.variables === comp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">Resolve</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}