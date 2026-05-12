import { useState } from 'react';
import { CheckCircle2, Loader2, Flag, X, History, CalendarDays } from 'lucide-react';
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
  resolution_note?: string | null;
  created_at: string;
  resolved_at?: string;
  resolved_by_name?: string;
}

export default function ManageComplaintsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolveModal, setResolveModal] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});
  const [resolutionNote, setResolutionNote] = useState("");
  const queryClient = useQueryClient();

  const { data: allComplaints, isLoading: loadingTeam } = useQuery<TeamComplaint[]>({
    queryKey: ['complaints', 'team'],
    queryFn: () => api.get(`/complaints/team`).then(res => res.data),
  });

  const pendingComplaints = allComplaints?.filter(c => c.status?.toLowerCase() !== 'resolved') || [];
  const resolvedComplaints = allComplaints?.filter(c => c.status?.toLowerCase() === 'resolved') || [];

  const resolveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string, note: string }) => 
      api.patch(`/complaints/${id}`, { status: 'resolved', resolution_note: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', 'team'] });
      setResolveModal({ isOpen: false, id: null });
      setResolutionNote("");
    }
  });

  const handleResolveSubmit = () => {
    if (resolveModal.id) {
      resolveMutation.mutate({ id: resolveModal.id, note: resolutionNote });
    }
  };

  // Helper function to format ISO dates to readable text
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' 
    }).format(new Date(dateString));
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto relative">
      <div className="px-1 flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-slate-900 leading-tight">Grievance Resolutions</h1>
        <p className="text-slate-500">Review and resolve employee concerns.</p>
      </div>

      {/* BLOCK 1: ACTIVE CASES */}
      <div className="glass-panel overflow-hidden border border-white/40 shadow-xl rounded-3xl bg-white/30 backdrop-blur-md">
        <div className="p-6 border-b border-white/20 flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
            <Flag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Active Cases</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Requires resolution</p>
          </div>
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
                <tr><td colSpan={4} className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-50" /></td></tr>
              ) : pendingComplaints.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">No active grievances</td></tr>
              ) : (
                pendingComplaints.map((comp) => (
                  <tr key={comp.id} className="hover:bg-white/40 transition-colors align-top">
                    <td className="py-4 px-4 md:px-6">
                      <div className="flex items-center gap-2 mt-1">
                        <div className={cn("w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black", comp.is_anonymous ? "bg-slate-100 text-slate-400" : "bg-primary/10 text-primary")}>
                          {comp.is_anonymous ? "?" : (comp.reporter_name?.substring(0, 1) || "U")}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-sm leading-none mb-1">{comp.is_anonymous ? "Anonymous" : comp.reporter_name}</span>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 italic">
                            <CalendarDays className="w-3 h-3" />
                            {formatDate(comp.created_at)}
                          </div>
                          <span className="sm:hidden text-[10px] font-black text-slate-800 uppercase tracking-tight mt-2">{comp.title}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 md:px-6 font-black text-slate-800 text-[10px] uppercase tracking-tight hidden sm:table-cell mt-1">
                      <div className="mt-2">{comp.title}</div>
                    </td>
                    <td className="py-4 px-4 md:px-6 w-full max-w-[200px] md:max-w-sm">
                      <div className={cn("text-xs text-slate-600 leading-relaxed cursor-pointer transition-all mt-1", expandedId === comp.id ? "whitespace-pre-wrap" : "line-clamp-2")} onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)}>
                        {comp.description}
                      </div>
                      {(comp.description?.length || 0) > 60 && (
                        <span className="inline-block cursor-pointer text-[9px] font-black text-rose-500 mt-1 uppercase tracking-tighter" onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)}>
                          {expandedId === comp.id ? "Close Details" : "View Full Description"}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 md:px-6 text-right">
                      <button onClick={() => setResolveModal({ isOpen: true, id: comp.id })} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 border border-emerald-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ml-auto shadow-sm active:scale-[0.98] transition-all mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
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

      {/* BLOCK 2: RESOLVED HISTORY */}
      <div className="glass-panel overflow-hidden border border-white/40 shadow-xl rounded-3xl bg-white/30 backdrop-blur-md mt-10">
        <div className="p-6 border-b border-white/20 flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Resolved Cases</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Historical records</p>
          </div>
        </div>

        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="bg-white/40 text-left border-b border-white/10">
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Reporter</th>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic hidden sm:table-cell">Subject</th>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic min-w-[200px]">Resolution Note</th>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loadingTeam ? (
                <tr><td colSpan={4} className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-50" /></td></tr>
              ) : resolvedComplaints.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">No resolved grievances</td></tr>
              ) : (
                resolvedComplaints.map((comp) => (
                  <tr key={comp.id} className="hover:bg-white/40 transition-colors align-top opacity-80">
                    <td className="py-4 px-4 md:px-6">
                      <div className="flex items-center gap-2 mt-1">
                        <div className={cn("w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black", comp.is_anonymous ? "bg-slate-100 text-slate-400" : "bg-primary/10 text-primary")}>
                          {comp.is_anonymous ? "?" : (comp.reporter_name?.substring(0, 1) || "U")}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-sm leading-none mb-1">{comp.is_anonymous ? "Anonymous" : comp.reporter_name}</span>
                          {!comp.is_anonymous && <span className="text-[10px] font-bold text-slate-400 italic">ID: {comp.id.substring(0, 8)}</span>}
                          <span className="sm:hidden text-[10px] font-black text-slate-800 uppercase tracking-tight mt-2">{comp.title}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 md:px-6 font-black text-slate-800 text-[10px] uppercase tracking-tight hidden sm:table-cell mt-1">
                      <div className="mt-2">{comp.title}</div>
                      <div className="text-xs text-slate-500 mt-2 line-clamp-1">{comp.description}</div>
                    </td>
                    <td className="py-4 px-4 md:px-6">
                      <div className="text-xs text-emerald-700 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 mt-1 whitespace-pre-wrap">
                        {comp.resolution_note || <span className="italic opacity-50">No notes provided.</span>}
                      </div>
                    </td>
                    <td className="py-4 px-4 md:px-6">
                      <div className="flex flex-col gap-2 mt-1 border-l-2 border-slate-200 pl-3">
                        <div>
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Submitted</span>
                          <span className="text-xs font-medium text-slate-600">{formatDate(comp.created_at)}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-black text-emerald-500 uppercase tracking-widest">Resolved By {comp.resolved_by_name || 'Admin'}</span>
                          <span className="text-xs font-medium text-slate-600">{formatDate(comp.resolved_at)}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution Modal Overlay */}
      {resolveModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white/90 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-6 w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Resolve Grievance</h3>
              <button onClick={() => setResolveModal({ isOpen: false, id: null })} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Resolution Notes</label>
                <textarea 
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Detail how this grievance was addressed..."
                  className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm min-h-[120px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                />
              </div>
              
              <div className="flex gap-3 justify-end pt-4">
                <button onClick={() => setResolveModal({ isOpen: false, id: null })} className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={handleResolveSubmit}
                  disabled={resolveMutation.isPending || !resolutionNote.trim()}
                  className="px-6 py-3 rounded-xl text-sm font-bold bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {resolveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Submit Resolution
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}