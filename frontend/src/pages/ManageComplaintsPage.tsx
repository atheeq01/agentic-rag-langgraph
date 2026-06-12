import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Easing } from 'framer-motion';
import { 
  CheckCircle2, Loader2, Flag, X, History, CalendarDays 
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';

const EASE: Easing = 'easeOut';
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: EASE },
});

interface TeamComplaint {
  id: string; user_id: string; title: string; department: string;
  description: string; status: string; is_anonymous: boolean; priority: string;
  reporter_name?: string; resolution_note?: string | null;
  created_at: string; resolved_at?: string; resolved_by_name?: string;
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
      void queryClient.invalidateQueries({ queryKey: ['complaints', 'team'] });
      setResolveModal({ isOpen: false, id: null });
      setResolutionNote("");
    }
  });

  const handleResolveSubmit = () => {
    if (resolveModal.id) {
      resolveMutation.mutate({ id: resolveModal.id, note: resolutionNote });
    }
  };

  const fmt = (dateString?: string) => {
    if (!dateString) return "—";
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' 
    }).format(new Date(dateString));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
        <h1 className="text-xl font-bold text-foreground">Grievance Resolutions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Review and resolve employee concerns.</p>
      </motion.div>

      {/* Active Cases */}
      <motion.div {...fadeUp(0.05)} className="table-wrapper">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground leading-tight">Active Cases</h2>
              <p className="text-xs text-muted-foreground">Requires resolution</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
            {pendingComplaints.length} active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50">
                <th className="table-header py-2.5 px-5 text-left">Reporter</th>
                <th className="table-header py-2.5 px-5 text-left hidden sm:table-cell">Subject</th>
                <th className="table-header py-2.5 px-5 text-left">Description</th>
                <th className="table-header py-2.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingTeam ? (
                <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" /></td></tr>
              ) : pendingComplaints.length === 0 ? (
                <tr><td colSpan={4} className="py-16 text-center">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">No active grievances.</p>
                  <p className="text-xs text-muted-foreground mt-1">Excellent work environment!</p>
                </td></tr>
              ) : (
                pendingComplaints.map((comp) => (
                  <tr key={comp.id} className="table-row align-top">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${comp.is_anonymous ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                          {comp.is_anonymous ? "?" : (comp.reporter_name?.substring(0, 1) || "U")}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{comp.is_anonymous ? "Anonymous" : comp.reporter_name}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                              <CalendarDays className="w-3 h-3" /> {fmt(comp.created_at)}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              comp.priority === 'high' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                              comp.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                              'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                            }`}>
                              {comp.priority || 'medium'}
                            </span>
                          </div>
                          {/* Mobile only subject */}
                          <div className="sm:hidden mt-2">
                            <p className="text-xs font-semibold text-foreground truncate">{comp.title}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 hidden sm:table-cell">
                      <p className="font-semibold text-foreground">{comp.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">ID: {comp.id.substring(0, 8)}</p>
                    </td>
                    <td className="py-4 px-5">
                      <div 
                        className={`text-sm text-foreground cursor-pointer transition-all ${expandedId === comp.id ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}
                        onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)}
                      >
                        {comp.description}
                      </div>
                      {(comp.description?.length || 0) > 60 && (
                        <button 
                          className="text-xs text-primary font-medium mt-1 hover:underline focus:outline-none"
                          onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)}
                        >
                          {expandedId === comp.id ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button 
                        onClick={() => setResolveModal({ isOpen: true, id: comp.id })} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 rounded-lg transition-colors text-xs font-semibold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Resolve</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Resolved History */}
      <motion.div {...fadeUp(0.1)} className="table-wrapper">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground leading-tight">Resolved Cases</h2>
            <p className="text-xs text-muted-foreground">Historical records</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50">
                <th className="table-header py-2.5 px-5 text-left">Reporter</th>
                <th className="table-header py-2.5 px-5 text-left hidden sm:table-cell">Subject</th>
                <th className="table-header py-2.5 px-5 text-left">Resolution Note</th>
                <th className="table-header py-2.5 px-5 text-left">Timeline</th>
              </tr>
            </thead>
            <tbody>
              {loadingTeam ? (
                <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" /></td></tr>
              ) : resolvedComplaints.length === 0 ? (
                <tr><td colSpan={4} className="py-16 text-center">
                  <History className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">No resolved grievances yet.</p>
                </td></tr>
              ) : (
                resolvedComplaints.map((comp) => (
                  <tr key={comp.id} className="table-row align-top">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${comp.is_anonymous ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                          {comp.is_anonymous ? "?" : (comp.reporter_name?.substring(0, 1) || "U")}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{comp.is_anonymous ? "Anonymous" : comp.reporter_name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {!comp.is_anonymous && <span className="text-[11px] text-muted-foreground">ID: {comp.id.substring(0, 8)}</span>}
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              comp.priority === 'high' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                              comp.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                              'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                            }`}>
                              {comp.priority || 'medium'}
                            </span>
                          </div>
                          {/* Mobile only subject */}
                          <div className="sm:hidden mt-2">
                            <p className="text-xs font-semibold text-foreground truncate">{comp.title}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 hidden sm:table-cell">
                      <p className="font-semibold text-foreground">{comp.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{comp.description}</p>
                    </td>
                    <td className="py-4 px-5">
                      <div className="text-xs text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-500/20 whitespace-pre-wrap leading-relaxed">
                        {comp.resolution_note || <span className="italic opacity-70">No notes provided.</span>}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex flex-col gap-2.5 border-l-2 border-secondary pl-3">
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground">Submitted</p>
                          <p className="text-xs font-medium text-foreground mt-0.5">{fmt(comp.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-500">Resolved By {comp.resolved_by_name || 'Admin'}</p>
                          <p className="text-xs font-medium text-foreground mt-0.5">{fmt(comp.resolved_at)}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Resolution Modal */}
      <Modal
        isOpen={resolveModal.isOpen}
        onClose={() => setResolveModal({ isOpen: false, id: null })}
        title="Resolve Grievance"
        description="Detail how this grievance was addressed."
        maxWidth="lg"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Resolution Notes</label>
            <textarea 
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Detail how this grievance was addressed..."
              className="input w-full min-h-[120px] resize-none"
            />
          </div>
          
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setResolveModal({ isOpen: false, id: null })} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button 
              onClick={handleResolveSubmit}
              disabled={resolveMutation.isPending || !resolutionNote.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {resolveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Submit Resolution
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}