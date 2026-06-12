import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Easing } from 'framer-motion';
import {
  Plus, Calendar, Clock, CheckCircle2, Loader2,
  AlertCircle, MessageSquare, ChevronDown, FileText, ArrowRight
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider, useFormContext, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';

const EASE: Easing = 'easeOut';

// ── Validation schema (unchanged) ─────────────────────────────
const formSchema = z.object({
  leaveType: z.string().min(1, 'Leave type is required.'),
  startDate: z.string().refine(v => v !== '' && !isNaN(Date.parse(v)), { message: 'Start date is required.' }),
  endDate:   z.string().refine(v => v !== '' && !isNaN(Date.parse(v)), { message: 'End date is required.' }),
  reason: z.string().max(500, 'Reason must be at most 500 characters.').optional(),
}).superRefine((data, ctx) => {
  if (data.leaveType === 'Annual' && data.startDate) {
    const diffDays = Math.ceil((new Date(data.startDate).getTime() - new Date().getTime()) / 86_400_000);
    if (diffDays < 14) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Annual leave requires 14 days advance notice.', path: ['startDate'] });
  }
  if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End date must be on or after start date.', path: ['endDate'] });
  }
});

interface Leave {
  id: string; leave_type: string; start_date: string; end_date: string;
  reason: string; status: 'pending' | 'approved' | 'rejected';
  created_at?: string; approved_at?: string; approver_name?: string;
}
interface UserProfile {
  annual_leave_balance: number; sick_leave_balance: number;
  maternity_leave_balance: number; paternity_leave_balance: number;
  bereavement_leave_balance: number; unpaid_leave_balance: number;
}

// ── Skeleton ───────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-secondary ${className}`} />;
}

// ── Status badge ───────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'badge-approved', rejected: 'badge-rejected', pending: 'badge-pending',
  };
  const dot: Record<string, string> = {
    approved: 'bg-emerald-500', rejected: 'bg-rose-500', pending: 'bg-amber-500',
  };
  return (
    <span className={`badge ${map[status] ?? 'badge-pending'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] ?? 'bg-slate-400'}`} />
      <span className="capitalize">{status}</span>
    </span>
  );
}

// Custom components imported from ui

// ── Form wiring (unchanged) ────────────────────────────────────
const Form = FormProvider;
const FormFieldContext = React.createContext<{ name: string }>({ name: '' });
const FormField = ({ name, render }: any) => {
  const { control } = useFormContext();
  return <FormFieldContext.Provider value={{ name }}><Controller name={name} control={control} render={render} /></FormFieldContext.Provider>;
};
const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-1.5', className)} {...props} />
));
FormItem.displayName = 'FormItem';
const FormControl = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ ...props }, ref) => (
  <div ref={ref} className="relative w-full" {...props} />
));
FormControl.displayName = 'FormControl';
const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, children, ...props }, ref) => {
  const { name } = React.useContext(FormFieldContext);
  const { formState: { errors } } = useFormContext();
  const error = errors[name];
  const body = error ? String(error?.message) : children;
  if (!body) return null;
  return (
    <AnimatePresence>
      <motion.p ref={ref} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
        className={cn('text-xs font-medium text-destructive', className)} {...(props as any)}>
        {body}
      </motion.p>
    </AnimatePresence>
  );
});
FormMessage.displayName = 'FormMessage';

export default function MyLeavesPage() {
  const [activeTab, setActiveTab] = useState<'file' | 'history' | 'policy'>('file');
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { leaveType: 'Annual', startDate: '', endDate: '', reason: '' },
  });

  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ['auth', 'me'],
    queryFn: () => api.get('/auth/me').then(res => res.data),
  });

  const { data: policyData } = useQuery<{ policy: string }>({
    queryKey: ['leaves', 'policy'],
    queryFn: () => api.get('/leaves/policy').then(res => res.data),
  });

  const { data: myLeaves = [], isLoading } = useQuery<Leave[]>({
    queryKey: ['leaves', 'me'],
    queryFn: () => api.get('/leaves/me').then(res => res.data),
  });

  const fileMutation = useMutation({
    mutationFn: (data: { start_date: string; end_date: string; leave_type: string; reason: string }) => api.post('/leaves/', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leaves', 'me'] });
      setActiveTab('history');
      form.reset();
      toast.success('Leave request submitted successfully!');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to apply for leave.'),
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (userProfile) {
      const start = new Date(data.startDate), end = new Date(data.endDate);
      const duration = Math.ceil(Math.abs(end.getTime() - start.getTime()) / 86_400_000) + 1;
      const tl = data.leaveType.toLowerCase();
      const bal: Record<string, number> = {
        annual: userProfile.annual_leave_balance, sick: userProfile.sick_leave_balance,
        maternity: userProfile.maternity_leave_balance, paternity: userProfile.paternity_leave_balance,
        bereavement: userProfile.bereavement_leave_balance, 'unpaid family': userProfile.unpaid_leave_balance,
      };
      if (duration > (bal[tl] ?? 0)) {
        form.setError('leaveType', { type: 'manual', message: `Insufficient balance. You only have ${bal[tl] ?? 0} days left.` });
        return;
      }
    }
    fileMutation.mutate({ start_date: data.startDate, end_date: data.endDate, leave_type: data.leaveType, reason: data.reason || '' });
  };

  const selectedType = form.watch('leaveType');
  const selectedStart = form.watch('startDate');
  const getMinStart = () => { const d = new Date(); if (selectedType === 'Annual') d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0]; };

  const calcDays = (s: string, e: string) => Math.ceil(Math.abs(new Date(e).getTime() - new Date(s).getTime()) / 86_400_000) + 1;
  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const leaveOptions = [
    { value: 'Annual', label: 'Annual Leave (Paid)' },
    { value: 'Sick', label: 'Sick Leave' },
    { value: 'Bereavement', label: 'Bereavement' },
    { value: 'Maternity', label: 'Maternity' },
    { value: 'Paternity', label: 'Paternity' },
    { value: 'Unpaid Family', label: 'Unpaid Family' },
  ];

  const balances = [
    { label: 'Annual',      days: userProfile?.annual_leave_balance    ?? 0, color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600' },
    { label: 'Sick',        days: userProfile?.sick_leave_balance       ?? 0, color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' },
    { label: 'Maternity',   days: userProfile?.maternity_leave_balance  ?? 0, color: 'bg-pink-50 dark:bg-pink-500/10 text-pink-600' },
    { label: 'Paternity',   days: userProfile?.paternity_leave_balance  ?? 0, color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600' },
    { label: 'Bereavement', days: userProfile?.bereavement_leave_balance ?? 0, color: 'bg-slate-100 dark:bg-slate-500/10 text-slate-600' },
    { label: 'Unpaid',      days: userProfile?.unpaid_leave_balance     ?? 0, color: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600' },
  ];

  const tabs = [
    { id: 'file' as const,    label: 'Request Leave',   icon: Plus },
    { id: 'history' as const, label: 'My Applications', icon: MessageSquare },
    { id: 'policy' as const,  label: 'Leave Policy',    icon: FileText },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
        <h1 className="text-xl font-bold text-foreground">Leave Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Request, track, and manage your time off.</p>
      </motion.div>

      {/* Compact balance strip */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05, ease: EASE }}
        className="card p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3">Leave Balances</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {balances.map(b => (
            <div key={b.label} className={`rounded-xl p-3 text-center ${b.color}`}>
              <p className="text-2xl font-bold">{b.days}</p>
              <p className="text-[10px] font-semibold mt-0.5 opacity-80">{b.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tab bar */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08, ease: EASE }}
        className="flex gap-1 p-1 bg-secondary rounded-xl w-fit">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'file' && (
          <motion.div key="file" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25, ease: EASE }}
            className="card p-6">
            <h2 className="text-base font-semibold text-foreground mb-5">Request Time Off</h2>

            {/* Policy notice */}
            <div className="mb-5 p-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">Annual leaves must be submitted at least 14 days in advance. Sick leaves exceeding 3 days require a doctor's certificate.</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField name="startDate" control={form.control} render={({ field }: any) => (
                    <FormItem>
                      <FormControl>
                        <DatePicker
                          label="Start Date"
                          value={field.value}
                          onChange={field.onChange}
                          minDate={getMinStart()}
                          error={!!form.formState.errors.startDate}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name="endDate" control={form.control} render={({ field }: any) => (
                    <FormItem>
                      <FormControl>
                        <DatePicker
                          label="End Date"
                          value={field.value}
                          onChange={field.onChange}
                          minDate={selectedStart || new Date().toISOString().split('T')[0]}
                          error={!!form.formState.errors.endDate}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField name="leaveType" control={form.control} render={({ field }: any) => (
                  <FormItem>
                    <FormControl>
                      <Select 
                        label="Leave Type" 
                        value={field.value} 
                        options={leaveOptions} 
                        onChange={field.onChange} 
                        error={!!form.formState.errors.leaveType}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField name="reason" control={form.control} render={({ field }: any) => (
                  <FormItem>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Reason (optional)</label>
                    <FormControl>
                      <textarea rows={3} {...field}
                        className={`input w-full resize-none ${form.formState.errors.reason ? 'border-destructive' : ''}`}
                        placeholder="Provide a brief reason for your leave…" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <button type="submit" disabled={fileMutation.isPending}
                  className="btn-primary w-full py-3 text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                  {fileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  {fileMutation.isPending ? 'Submitting…' : 'Submit Request'}
                </button>
              </form>
            </Form>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25, ease: EASE }}
            className="table-wrapper">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">My Applications</h2>
              <span className="text-xs text-muted-foreground">{myLeaves.length} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="table-header py-2.5 px-5 text-left w-[180px]">Type</th>
                    <th className="table-header py-2.5 px-5 text-left">Duration</th>
                    <th className="table-header py-2.5 px-5 text-left hidden sm:table-cell">Applied</th>
                    <th className="table-header py-2.5 px-5 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" /></td></tr>
                  ) : myLeaves.length === 0 ? (
                    <tr><td colSpan={4} className="py-16 text-center">
                      <Calendar className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-30" />
                      <p className="text-sm text-muted-foreground">No leave applications yet</p>
                      <button onClick={() => setActiveTab('file')} className="mt-3 text-xs text-primary font-semibold hover:underline flex items-center gap-1 mx-auto">
                        Apply now <ArrowRight className="w-3 h-3" />
                      </button>
                    </td></tr>
                  ) : (
                    myLeaves.map((leave: Leave) => (
                      <tr key={leave.id} className="table-row">
                        <td className="py-3.5 px-5">
                          <p className="font-semibold text-foreground text-sm capitalize">{leave.leave_type}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{leave.start_date} → {leave.end_date}</p>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="font-semibold text-foreground">{calcDays(leave.start_date, leave.end_date)} days</span>
                        </td>
                        <td className="py-3.5 px-5 text-xs text-muted-foreground hidden sm:table-cell">{fmt(leave.created_at)}</td>
                        <td className="py-3.5 px-5">
                          <div className="flex flex-col gap-1 items-start">
                            <StatusBadge status={leave.status} />
                            {leave.approved_at && (
                              <p className="text-[10px] text-muted-foreground">By {leave.approver_name || 'Manager'} · {fmt(leave.approved_at)}</p>
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
        )}

        {activeTab === 'policy' && (
          <motion.div key="policy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25, ease: EASE }}
            className="card p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Company Leave Policy</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
              {policyData?.policy || <Skeleton className="h-48" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}