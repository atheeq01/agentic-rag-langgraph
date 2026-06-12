import { motion } from 'framer-motion';
import type { Easing } from 'framer-motion';
import {
  Calendar, Flag, Users, MessageSquarePlus, FileText,
  Clock, Loader2, TrendingUp, ArrowRight, type LucideProps, CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore, isManagerOrAbove, isHROrAdmin } from '@/store/useStore';

const EASE: Easing = 'easeOut';
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: EASE },
});

// ── Skeleton loader ────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-secondary ${className}`} />;
}

// ── Stat card ──────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, color, bg, loading, href, actionLabel,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.FC<LucideProps>; color: string; bg: string;
  loading?: boolean; href?: string; actionLabel?: string;
}) {
  return (
    <div className="card p-5 flex flex-col gap-3 h-full hover:shadow-card-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <p className="text-3xl font-bold text-foreground tracking-tight mt-0.5">{value}</p>
          )}
          {sub && !loading && (
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      {href && (
        <Link
          to={href}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-80 transition-opacity mt-auto"
        >
          {actionLabel ?? 'View all'} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

// ── Leave balance row ──────────────────────────────────────────
function LeaveBar({ label, remaining, total, color }: {
  label: string; remaining: number; total: number; color: string;
}) {
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
  const isLow = pct < 25;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`text-xs font-semibold ${isLow ? 'text-rose-500' : 'text-foreground'}`}>
          {remaining} / {total} days
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isLow ? 'bg-rose-400' : color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
        />
      </div>
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────
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
    <span className={`badge ${map[status] ?? 'badge-open'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] ?? 'bg-slate-400'}`} />
      <span className="capitalize">{status}</span>
    </span>
  );
}

export default function DashboardPage() {
  const user = useAuthStore(state => state.user);

  const { data: myLeaves, isLoading: loadingLeaves } = useQuery({
    queryKey: ['leaves', 'me'],
    queryFn: () => api.get('/leaves/me').then(res => res.data),
  });

  const { data: teamLeaves, isLoading: loadingTeamLeaves } = useQuery({
    queryKey: ['leaves', 'team'],
    queryFn: () => api.get('/leaves/team?status=pending').then(res => res.data),
    enabled: isManagerOrAbove(user),
  });

  const { data: teamMembers, isLoading: loadingTeamMembers } = useQuery({
    queryKey: ['users', 'team'],
    queryFn: () => api.get('/users/').then(res => res.data),
    enabled: isManagerOrAbove(user),
  });

  const { data: myComplaints, isLoading: loadingComplaints } = useQuery({
    queryKey: ['complaints', 'me'],
    queryFn: () => api.get('/complaints/me').then(res => res.data),
  });

  const calcDays = (s: string, e: string) =>
    Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86_400_000) + 1;

  const calcUsed = (type: string) =>
    myLeaves
      ?.filter((l: any) => l.status === 'approved' && l.leave_type.toLowerCase().includes(type))
      .reduce((acc: number, l: any) => acc + calcDays(l.start_date, l.end_date), 0) ?? 0;

  const annualBase  = user?.annual_leave_balance    ?? 20;
  const sickBase    = user?.sick_leave_balance      ?? 10;
  const matBase     = user?.maternity_leave_balance ?? 0;
  const patBase     = user?.paternity_leave_balance ?? 0;

  const annualRem = annualBase  - calcUsed('annual');
  const sickRem   = sickBase    - calcUsed('sick');

  const activeComplaints = myComplaints?.filter((c: any) => c.status !== 'resolved').length ?? 0;
  const teamPending      = teamLeaves?.length ?? 0;

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  const firstName = user?.name?.split(' ')[0] ?? '';

  const quickActions = [
    { title: 'Apply Leave',    icon: Calendar,          path: '/leaves',             color: 'text-blue-500',  bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { title: 'File Complaint', icon: Flag,              path: '/complaints',         color: 'text-rose-500',  bg: 'bg-rose-50 dark:bg-rose-500/10' },
    { title: 'AI Assistant',   icon: MessageSquarePlus, path: '/ai-chat',            color: 'text-primary',   bg: 'bg-primary/10' },
    ...(isHROrAdmin(user) ? [{ title: 'Documents', icon: FileText, path: '/documents', color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-500/10' }] : []),
  ];

  const leaveBars = [
    { label: 'Annual Leave',    remaining: annualRem, total: annualBase, color: 'bg-primary' },
    { label: 'Sick Leave',      remaining: sickRem,   total: sickBase,   color: 'bg-blue-500' },
    ...(matBase > 0 ? [{ label: 'Maternity Leave', remaining: matBase, total: matBase, color: 'bg-pink-500' }] : []),
    ...(patBase > 0 ? [{ label: 'Paternity Leave', remaining: patBase, total: patBase, color: 'bg-purple-500' }] : []),
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div {...fadeUp()}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {greeting()}{firstName ? `, ${firstName}` : ''} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Here's what's happening with your HR workspace today.
            </p>
          </div>
          {user && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold capitalize flex-shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
              {user.role}
            </span>
          )}
        </div>
      </motion.div>

      {/* ── Top stat cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div {...fadeUp(0.05)} className="col-span-1">
          <StatCard
            label="Annual Leave"
            value={loadingLeaves ? '—' : `${annualRem} days`}
            sub={`of ${annualBase} total`}
            icon={Calendar}
            color="text-blue-500"
            bg="bg-blue-50 dark:bg-blue-500/10"
            loading={loadingLeaves}
            href="/leaves"
            actionLabel="Book leave"
          />
        </motion.div>
        <motion.div {...fadeUp(0.08)} className="col-span-1">
          <StatCard
            label="Sick Leave"
            value={loadingLeaves ? '—' : `${sickRem} days`}
            sub={`of ${sickBase} total`}
            icon={Clock}
            color="text-emerald-500"
            bg="bg-emerald-50 dark:bg-emerald-500/10"
            loading={loadingLeaves}
            href="/leaves"
            actionLabel="Book sick leave"
          />
        </motion.div>
        <motion.div {...fadeUp(0.11)} className="col-span-1">
          <StatCard
            label="Active Complaints"
            value={loadingComplaints ? '—' : activeComplaints}
            sub="open / under review"
            icon={Flag}
            color="text-rose-500"
            bg="bg-rose-50 dark:bg-rose-500/10"
            loading={loadingComplaints}
            href="/complaints"
            actionLabel="View complaints"
          />
        </motion.div>
        {isManagerOrAbove(user) ? (
          <motion.div {...fadeUp(0.14)} className="col-span-1">
            <StatCard
              label="Team Leave Requests"
              value={loadingTeamLeaves ? '—' : teamPending}
              sub="awaiting approval"
              icon={Users}
              color="text-primary"
              bg="bg-primary/10"
              loading={loadingTeamLeaves}
              href="/leaves/manage"
              actionLabel="Review now"
            />
          </motion.div>
        ) : (
          <motion.div {...fadeUp(0.14)} className="col-span-1">
            <StatCard
              label="Leaves Filed"
              value={loadingLeaves ? '—' : myLeaves?.length ?? 0}
              sub="all time"
              icon={CheckCircle2}
              color="text-purple-500"
              bg="bg-purple-50 dark:bg-purple-500/10"
              loading={loadingLeaves}
              href="/leaves"
              actionLabel="My leaves"
            />
          </motion.div>
        )}
      </div>

      {/* ── Middle row: Leave balances + Quick actions ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Leave balance overview (deduplicated — only shows here) */}
        <motion.div {...fadeUp(0.15)} className="lg:col-span-3 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Leave Balance Overview</h2>
            <Link to="/leaves" className="text-xs font-medium text-primary hover:opacity-80 flex items-center gap-1">
              Apply <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loadingLeaves ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-7" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {leaveBars.map(b => (
                <LeaveBar key={b.label} {...b} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick actions */}
        <motion.div {...fadeUp(0.18)} className="lg:col-span-2 card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {quickActions.map((action) => (
              <Link key={action.path} to={action.path}>
                <motion.div
                  whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  whileTap={{ scale: 0.97 }}
                  className="flex flex-col items-center gap-2.5 p-3.5 rounded-xl border border-border hover:border-primary/20 bg-background hover:bg-secondary/50 transition-colors cursor-pointer text-center"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${action.bg}`}>
                    <action.icon className={`w-4.5 h-4.5 ${action.color}`} style={{ width: 18, height: 18 }} />
                  </div>
                  <span className="text-xs font-semibold text-foreground leading-tight">{action.title}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Bottom: Activity tables ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* My complaints */}
        <motion.div {...fadeUp(0.22)} className="table-wrapper">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Recent Complaints</h2>
            <Link to="/complaints" className="text-xs font-medium text-primary hover:opacity-80 flex items-center gap-1">
              All complaints <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3 space-y-2">
            {loadingComplaints ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)
            ) : !myComplaints?.length ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Flag className="w-6 h-6 mx-auto mb-2 opacity-30" />
                No complaints filed yet
              </div>
            ) : (
              myComplaints.slice(0, 4).map((comp: any) => (
                <div key={comp.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/60 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{comp.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">#{comp.id.substring(0, 8)}</p>
                  </div>
                  <StatusBadge status={comp.status} />
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Team leave requests (managers) / My leave history (employees) */}
        {isManagerOrAbove(user) ? (
          <motion.div {...fadeUp(0.25)} className="table-wrapper">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Pending Team Requests</h2>
              <Link to="/leaves/manage" className="text-xs font-medium text-primary hover:opacity-80 flex items-center gap-1">
                Manage all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="table-header py-2.5 px-4 text-left">Employee</th>
                    <th className="table-header py-2.5 px-4 text-left">Type</th>
                    <th className="table-header py-2.5 px-4 text-left">Dates</th>
                    <th className="table-header py-2.5 px-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTeamLeaves && (
                    <tr><td colSpan={4} className="py-10 text-center">
                      <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                    </td></tr>
                  )}
                  {!loadingTeamLeaves && !teamLeaves?.length && (
                    <tr><td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-2 opacity-30" />
                      All caught up — no pending requests
                    </td></tr>
                  )}
                  {teamLeaves?.slice(0, 5).map((leave: any) => (
                    <tr key={leave.id} className="table-row">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {(leave.employee_id || '??').substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-foreground">{leave.employee_id}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground capitalize">{leave.leave_type}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {leave.start_date}<br />{leave.end_date}
                      </td>
                      <td className="py-3 px-4"><StatusBadge status="pending" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          /* Employee: My leave history */
          <motion.div {...fadeUp(0.25)} className="table-wrapper">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">My Leave History</h2>
              <Link to="/leaves" className="text-xs font-medium text-primary hover:opacity-80 flex items-center gap-1">
                Apply leave <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="table-header py-2.5 px-4 text-left">Type</th>
                    <th className="table-header py-2.5 px-4 text-left">Dates</th>
                    <th className="table-header py-2.5 px-4 text-left">Days</th>
                    <th className="table-header py-2.5 px-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingLeaves && (
                    <tr><td colSpan={4} className="py-10 text-center">
                      <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                    </td></tr>
                  )}
                  {!loadingLeaves && !myLeaves?.length && (
                    <tr><td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      <Calendar className="w-6 h-6 mx-auto mb-2 opacity-30" />
                      No leave applications yet
                    </td></tr>
                  )}
                  {myLeaves?.slice(0, 5).map((leave: any) => (
                    <tr key={leave.id} className="table-row">
                      <td className="py-3 px-4 text-xs font-medium text-foreground capitalize">{leave.leave_type}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {leave.start_date}<br />{leave.end_date}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-foreground">
                        {calcDays(leave.start_date, leave.end_date)}d
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={leave.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Team members (managers only) ────────────────────────── */}
      {isManagerOrAbove(user) && (
        <motion.div {...fadeUp(0.28)} className="table-wrapper">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">My Team</h2>
          </div>
          <div className="overflow-x-auto">
            {loadingTeamMembers ? (
              <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
            ) : !teamMembers?.length ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No team members found</div>
            ) : (
              <div className="divide-y divide-border">
                {teamMembers.slice(0, 8).map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3 hover:bg-secondary/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {(m.full_name || m.email || '').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{m.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium bg-secondary text-muted-foreground px-2.5 py-1 rounded-lg">
                      {m.department || 'General'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
