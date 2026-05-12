import { useState } from 'react';
import { 
  Loader2, 
  Users, 
  Check, 
  X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function ManageLeavesPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: teamLeaves, isLoading: loadingTeam } = useQuery({
    queryKey: ['leaves', 'team'],
    queryFn: () => api.get('/leaves/team?status=pending').then(res => res.data),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      api.post(`/leaves/${id}/action?approve=${approve}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves', 'team'] });
    }
  });

  return (
    <div className="space-y-6 md:space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 leading-tight">Manage Team Leaves</h1>
        <p className="text-sm md:text-base text-slate-500">Review and coordinate employee time-off requests.</p>
      </div>

      <div className="glass-panel overflow-hidden border border-white/40 shadow-2xl">
        <div className="p-5 md:p-6 border-b border-white/20 bg-white/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                <Users className="w-6 h-6" />
             </div>
             <div>
                <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight leading-none mb-1">Pending Queue</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Action required applications</p>
             </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="bg-white/40 text-left border-b border-white/10">
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Employee</th>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic hidden sm:table-cell">Duration</th>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Explanation</th>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loadingTeam ? (
                 <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-50" /></td></tr>
              ) : !teamLeaves || teamLeaves.length === 0 ? (
                 <tr><td colSpan={4} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] italic">No pending leave requests found</td></tr>
              ) : (
                teamLeaves.map((leave: any) => (
                  <tr key={leave.id} className="transition-colors hover:bg-white/40 group align-top">
                    <td className="py-4 px-4 md:px-6">
                       <div className="flex items-start gap-3 mt-1">
                          <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-white flex items-center justify-center text-slate-600 font-black text-xs shadow-sm">
                             {(leave.applicant_name || 'U').substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                             <span className="font-bold text-slate-900 text-sm truncate">{leave.applicant_name || 'Unknown'}</span>
                             <span className="text-[10px] font-black uppercase text-indigo-600 mt-0.5">
                               {leave.department || 'General'}
                             </span>
                             {/* Mobile Duration Info */}
                             <div className="sm:hidden flex flex-col mt-2">
                                <span className="text-[9px] font-black text-slate-900">{leave.start_date}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">to {leave.end_date}</span>
                                <span className="text-[9px] font-black text-primary mt-0.5">{leave.leave_type}</span>
                             </div>
                          </div>
                       </div>
                    </td>
                    <td className="py-4 px-4 md:px-6 hidden sm:table-cell">
                       <div className="flex flex-col mt-1">
                          <span className="text-[10px] font-black text-slate-900">{leave.start_date}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">to {leave.end_date}</span>
                          <span className="text-[8px] font-black text-primary mt-1">{leave.leave_type}</span>
                       </div>
                    </td>
                    <td className="py-4 px-4 md:px-6 w-full max-w-[150px] md:max-w-xs">
                      <div 
                        className={cn(
                          "text-xs text-slate-600 cursor-pointer hover:text-primary transition-all mt-1",
                          expandedId === leave.id ? "whitespace-pre-wrap" : "line-clamp-2"
                        )}
                        onClick={() => setExpandedId(expandedId === leave.id ? null : leave.id)}
                      >
                        {leave.reason}
                      </div>
                      {(leave.reason?.length || 0) > 40 && (
                        <span 
                          className="inline-block cursor-pointer text-[9px] font-black text-primary mt-1 uppercase tracking-tighter"
                          onClick={() => setExpandedId(expandedId === leave.id ? null : leave.id)}
                        >
                          {expandedId === leave.id ? "Show Less" : "Click to Expand"}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 md:px-6 text-right">
                      <div className="flex flex-col gap-2 items-end mt-1">
                        <button
                          onClick={() => actionMutation.mutate({ id: leave.id, approve: true })}
                          disabled={actionMutation.isPending}
                          className="w-[100px] flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100/50 text-[10px] font-black uppercase tracking-widest"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => actionMutation.mutate({ id: leave.id, approve: false })}
                          disabled={actionMutation.isPending}
                          className="w-[100px] flex items-center justify-center gap-2 px-3 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all border border-rose-100/50 text-[10px] font-black uppercase tracking-widest"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
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
