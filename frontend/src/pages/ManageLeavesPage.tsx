import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Easing } from 'framer-motion';
import { 
  Loader2, Users, Check, X, History,
  CheckCircle2, Clock as ClockIcon, Calendar, ArrowRight
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const EASE: Easing = 'easeOut';
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: EASE },
});

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:  'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    resolved: 'badge-resolved',
    open:     'badge-open',
  };
  const dot: Record<string, string> = {
    pending:  'bg-amber-500',
    approved: 'bg-emerald-500',
    rejected: 'bg-rose-500',
    resolved: 'bg-blue-500',
    open:     'bg-orange-500',
  };
  return (
    <span className={`badge ${map[status.toLowerCase()] ?? 'badge-open'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status.toLowerCase()] ?? 'bg-slate-400'}`} />
      <span className="capitalize">{status}</span>
    </span>
  );
}

export default function ManageLeavesPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: allTeamLeaves, isLoading: loadingTeam } = useQuery({
    queryKey: ['leaves', 'team'],
    queryFn: () => api.get('/leaves/team').then(res => res.data),
  });

  const pendingLeaves = allTeamLeaves?.filter((leave: any) => leave.status === 'pending') || [];
  const respondedLeaves = allTeamLeaves?.filter((leave: any) => leave.status !== 'pending') || [];

  const actionMutation = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      api.post(`/leaves/${id}/action?approve=${approve}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leaves', 'team'] });
    }
  });

  const fmt = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calcDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    return Math.ceil(Math.abs(new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
        <h1 className="text-xl font-bold text-foreground">Manage Team Leaves</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Review and coordinate employee time-off requests.</p>
      </motion.div>

      {/* Pending Queue */}
      <motion.div {...fadeUp(0.05)} className="table-wrapper">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground leading-tight">Pending Queue</h2>
              <p className="text-xs text-muted-foreground">Action required applications</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
            {pendingLeaves.length} pending
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50">
                <th className="table-header py-2.5 px-5 text-left">Employee</th>
                <th className="table-header py-2.5 px-5 text-left hidden sm:table-cell">Duration</th>
                <th className="table-header py-2.5 px-5 text-left">Explanation</th>
                <th className="table-header py-2.5 px-5 text-right">Decision</th>
              </tr>
            </thead>
            <tbody>
              {loadingTeam ? (
                <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" /></td></tr>
              ) : pendingLeaves.length === 0 ? (
                <tr><td colSpan={4} className="py-16 text-center">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">No pending requests.</p>
                  <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
                </td></tr>
              ) : (
                pendingLeaves.map((leave: any) => (
                  <tr key={leave.id} className="table-row align-top">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {(leave.applicant_name || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{leave.applicant_name || 'Unknown'}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{leave.department || 'General'}</p>
                          {/* Mobile only duration */}
                          <div className="sm:hidden mt-2">
                            <p className="text-xs font-semibold text-foreground">{leave.leave_type}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{leave.start_date} → {leave.end_date}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 hidden sm:table-cell">
                      <p className="font-semibold text-foreground">{calcDays(leave.start_date, leave.end_date)} days</p>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">{leave.leave_type}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{leave.start_date} → {leave.end_date}</p>
                    </td>
                    <td className="py-4 px-5">
                      <div 
                        className={`text-sm text-foreground cursor-pointer transition-all ${expandedId === leave.id ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}
                        onClick={() => setExpandedId(expandedId === leave.id ? null : leave.id)}
                      >
                        {leave.reason || <span className="italic text-muted-foreground">No reason provided.</span>}
                      </div>
                      {(leave.reason?.length || 0) > 60 && (
                        <button 
                          className="text-xs text-primary font-medium mt-1 hover:underline focus:outline-none"
                          onClick={() => setExpandedId(expandedId === leave.id ? null : leave.id)}
                        >
                          {expandedId === leave.id ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex flex-col gap-2 items-end">
                        <button
                          onClick={() => actionMutation.mutate({ id: leave.id, approve: true })}
                          disabled={actionMutation.isPending}
                          className="w-[100px] flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 rounded-lg transition-colors text-xs font-semibold"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => actionMutation.mutate({ id: leave.id, approve: false })}
                          disabled={actionMutation.isPending}
                          className="w-[100px] flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 rounded-lg transition-colors text-xs font-semibold"
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
      </motion.div>

      {/* History */}
      <motion.div {...fadeUp(0.1)} className="table-wrapper">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground leading-tight">Leave History</h2>
            <p className="text-xs text-muted-foreground">Previously actioned requests</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50">
                <th className="table-header py-2.5 px-5 text-left">Employee</th>
                <th className="table-header py-2.5 px-5 text-left hidden sm:table-cell">Duration</th>
                <th className="table-header py-2.5 px-5 text-left">Explanation</th>
                <th className="table-header py-2.5 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingTeam ? (
                <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" /></td></tr>
              ) : respondedLeaves.length === 0 ? (
                <tr><td colSpan={4} className="py-16 text-center">
                  <History className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">No leave history found.</p>
                </td></tr>
              ) : (
                respondedLeaves.map((leave: any) => (
                  <tr key={leave.id} className="table-row align-top">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary text-muted-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {(leave.applicant_name || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{leave.applicant_name || 'Unknown'}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{leave.department || 'General'}</p>
                          {/* Mobile only duration */}
                          <div className="sm:hidden mt-2">
                            <p className="text-xs font-semibold text-foreground capitalize">{leave.leave_type} ({calcDays(leave.start_date, leave.end_date)}d)</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{leave.start_date} → {leave.end_date}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 hidden sm:table-cell">
                      <p className="font-semibold text-foreground">{calcDays(leave.start_date, leave.end_date)} days</p>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">{leave.leave_type}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{leave.start_date} → {leave.end_date}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5">Applied: {fmt(leave.created_at)}</p>
                    </td>
                    <td className="py-4 px-5">
                      <div 
                        className={`text-sm text-foreground cursor-pointer transition-all ${expandedId === leave.id ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}
                        onClick={() => setExpandedId(expandedId === leave.id ? null : leave.id)}
                      >
                        {leave.reason || <span className="italic text-muted-foreground">No reason provided.</span>}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex flex-col gap-1 items-end">
                        <StatusBadge status={leave.status} />
                        {leave.approved_at && (
                          <div className="mt-1 flex flex-col items-end">
                            <p className="text-[10px] text-muted-foreground">Actioned by {leave.approver_name || 'Manager'}</p>
                            <p className="text-[10px] text-muted-foreground">{fmt(leave.approved_at)}</p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
