import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, Flag } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// Define strict interface to remove ESLint 'any' errors
interface TeamComplaint {
  id: string;
  user_id: string;
  title: string;
  department: string;
  description: string;
  status: string;
}

export default function ManageComplaintsPage() {
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
        <h1 className="text-3xl font-bold text-slate-900">Grievance Resolutions</h1>
        <p className="text-slate-500">Review and resolve employee concerns.</p>
      </div>

      <div className="glass-panel overflow-hidden border border-white/40 shadow-2xl rounded-3xl bg-white/30 backdrop-blur-md">
        <div className="p-6 border-b border-white/20 flex items-center gap-3">
          <div className="p-3 bg-rose-50 rounded-2xl text-rose-600"><Flag className="w-6 h-6" /></div>
          <h2 className="text-lg font-bold text-slate-800 uppercase">Active Cases</h2>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-white/40 text-left border-b border-white/10">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Reporter</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Subject</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Description</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loadingTeam ? (
                <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
              ) : !Array.isArray(teamComplaints) || teamComplaints.length === 0 ? (
                <tr><td colSpan={4} className="py-20 text-center text-slate-400 font-bold uppercase text-[10px]">No pending grievances</td></tr>
              ) : (
                teamComplaints.map((comp) => (
                  <tr key={comp.id} className="hover:bg-white/40 transition-colors">
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs">
                          {String(comp.user_id || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm truncate max-w-[120px]">{comp.user_id}</span>
                          <span className="text-[10px] font-bold text-slate-400 italic">ID: {comp.id.substring(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 font-black text-slate-800 text-xs uppercase">{comp.title}</td>
                    <td className="py-5 px-6 text-xs text-slate-600 truncate max-w-[200px]">{comp.description}</td>
                    <td className="py-5 px-6 text-right">
                      <button onClick={() => resolveMutation.mutate(comp.id)} disabled={resolveMutation.isPending} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 border border-emerald-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ml-auto">
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