import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Loader2, 
  Flag, 
  Users, 
  X, 
  Check,
  AlertCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function ManageComplaintsPage() {
  const queryClient = useQueryClient();

  const { data: teamComplaints, isLoading: loadingTeam } = useQuery({
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
    <div className="space-y-6 md:space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 leading-tight">Grievance Resolutions</h1>
        <p className="text-sm md:text-base text-slate-500">Review and resolve employee complaints and suggestions.</p>
      </div>

      <div className="glass-panel overflow-hidden border border-white/40 shadow-2xl">
        <div className="p-5 md:p-6 border-b border-white/20 bg-white/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                <Flag className="w-6 h-6" />
             </div>
             <div>
                <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight leading-none mb-1">Active Cases</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">All pending grievances</p>
             </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-white/40 text-left border-b border-white/10">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Reporter</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Subject</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Dept</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Description</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loadingTeam ? (
                 <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-50" /></td></tr>
              ) : !teamComplaints || teamComplaints.length === 0 ? (
                 <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] italic">No active grievances found</td></tr>
              ) : (
                teamComplaints.map((comp: any) => (
                  <tr key={comp.id} className="transition-colors hover:bg-white/40 group">
                    <td className="py-5 px-6">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-white flex items-center justify-center text-slate-600 font-black text-xs shadow-sm">
                             {(comp.employee_id || '').substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                             <span className="font-bold text-slate-900 text-sm truncate">{comp.employee_id}</span>
                             <span className="text-[10px] font-bold text-slate-400 italic">Case: {comp.id.substring(0, 8)}</span>
                          </div>
                       </div>
                    </td>
                    <td className="py-5 px-6">
                       <span className="font-black text-slate-800 text-xs uppercase tracking-tight">{comp.title}</span>
                    </td>
                    <td className="py-5 px-6">
                       <span className="inline-flex px-2 py-1 rounded-lg text-[9px] font-black border uppercase tracking-widest bg-slate-50 text-slate-700 border-slate-100">
                          {comp.department}
                       </span>
                    </td>
                    <td className="py-5 px-6">
                       <p className="text-xs text-slate-600 font-medium truncate max-w-[200px]">{comp.description}</p>
                    </td>
                    <td className="py-5 px-6 text-right">
                      <button
                        onClick={() => resolveMutation.mutate(comp.id)}
                        disabled={resolveMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100/50 text-[10px] font-black uppercase tracking-widest ml-auto"
                      >
                         {resolveMutation.isPending && resolveMutation.variables === comp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                         Resolve
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
