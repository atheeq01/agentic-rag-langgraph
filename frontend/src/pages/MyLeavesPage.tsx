import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Calendar, Clock, CheckCircle2, Loader2, AlertCircle, MessageSquare, ChevronDown
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Leave {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface UserProfile {
  annual_leave_balance: number;
  sick_leave_balance: number;
  maternity_leave_balance: number;
  paternity_leave_balance: number;
  bereavement_leave_balance: number;
  unpaid_leave_balance: number;
}

export default function MyLeavesPage() {
  const [activeTab, setActiveTab] = useState<'file' | 'history' | 'policy'>('file');
  const [formData, setFormData] = useState({ 
    start_date: '', 
    end_date: '', 
    leave_type: 'Annual', 
    reason: '' 
  });
  const [errorMsg, setErrorMsg] = useState('');
  const queryClient = useQueryClient();

  const { data: userProfile } = useQuery<UserProfile>({ 
    queryKey: ['auth', 'me'], 
    queryFn: () => api.get('/auth/me').then(res => res.data) 
  });

  const { data: policyData } = useQuery<{ policy: string }>({
    queryKey: ['leaves', 'policy'],
    queryFn: () => api.get('/leaves/policy').then(res => res.data)
  });

  const { data: myLeaves = [], isLoading } = useQuery<Leave[]>({
    queryKey: ['leaves', 'me'],
    queryFn: () => api.get('/leaves/me').then(res => res.data)
  });

  const fileMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/leaves/', {
      start_date: data.start_date,
      end_date: data.end_date,
      leave_type: data.leave_type,
      reason: data.reason
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leaves', 'me'] });
      setActiveTab('history');
      setFormData({ start_date: '', end_date: '', leave_type: 'Annual', reason: '' });
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Failed to apply for leave.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.start_date || !formData.end_date || !formData.reason.trim()) {
      setErrorMsg('All fields are required.');
      return;
    }

    const duration = calculateDuration(formData.start_date, formData.end_date);
    const daysInAdvance = Math.ceil((new Date(formData.start_date).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));

    if (formData.leave_type === 'Annual' && daysInAdvance < 14) {
      setErrorMsg(`Annual leaves must be submitted at least 14 days in advance.`);
      return;
    }

    fileMutation.mutate(formData);
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
  };

  const duration = calculateDuration(formData.start_date, formData.end_date);
  
  const daysInAdvance = formData.start_date
    ? Math.ceil((new Date(formData.start_date).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24))
    : 0;

  const showAdvanceWarning = duration > 3 && daysInAdvance < 14;

  const getMinStartDate = () => {
    const minDate = new Date();
    if (formData.leave_type === 'Annual') {
      minDate.setDate(minDate.getDate() + 14); 
    }
    return minDate.toISOString().split("T")[0];
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
      rejected: "bg-rose-50 text-rose-700 border-rose-100",
      pending: "bg-amber-50 text-amber-700 border-amber-100"
    };
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border",
        styles[status] || styles.pending
      )}>
        {status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
        {status}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Pending';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calculateTotalDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const leaveOptions = [
    { value: 'Annual', label: 'Annual Leave (Paid)' },
    { value: 'Sick', label: 'Sick Leave' },
    { value: 'Bereavement', label: 'Bereavement' },
    { value: 'Maternity', label: 'Maternity' },
    { value: 'Paternity', label: 'Paternity' },
    { value: 'Unpaid Family', label: 'Unpaid Family' },
  ];

  return (
    <div className="space-y-6 md:space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Leave Management</h1>
        <p className="text-sm text-slate-500">Request and track your leave applications.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-1">
        <BalanceCard 
          title="Annual Leave" 
          days={userProfile?.annual_leave_balance ?? 0} 
          icon={CheckCircle2} 
          color="text-emerald-600" 
        />
        <BalanceCard 
          title="Sick Leave" 
          days={userProfile?.sick_leave_balance ?? 0} 
          icon={Clock} 
          color="text-blue-600" 
        />
        <BalanceCard 
          title="Maternity" 
          days={userProfile?.maternity_leave_balance ?? 0} 
          icon={Calendar} 
          color="text-purple-600" 
        />
        <BalanceCard 
          title="Paternity" 
          days={userProfile?.paternity_leave_balance ?? 0} 
          icon={Calendar} 
          color="text-indigo-600" 
        />
        <BalanceCard 
          title="Bereavement" 
          days={userProfile?.bereavement_leave_balance ?? 0} 
          icon={AlertCircle} 
          color="text-slate-600" 
        />
        <BalanceCard 
          title="Unpaid Family" 
          days={userProfile?.unpaid_leave_balance ?? 0} 
          icon={Clock} 
          color="text-orange-600" 
        />
      </div>

      <div className="flex gap-1 p-1 bg-white/40 backdrop-blur-md border border-white/20 rounded-2xl w-fit">
        <button onClick={() => setActiveTab('file')} className={cn("px-6 py-2.5 rounded-xl text-xs font-bold uppercase", activeTab === 'file' ? "bg-white text-primary shadow-sm" : "text-slate-500")}>
          <Plus className="w-4 h-4 inline mr-2" /> Request Leave
        </button>
        <button onClick={() => setActiveTab('history')} className={cn("px-6 py-2.5 rounded-xl text-xs font-bold uppercase", activeTab === 'history' ? "bg-white text-primary shadow-sm" : "text-slate-500")}>
          <MessageSquare className="w-4 h-4 inline mr-2" /> My Applications
        </button>
        <button onClick={() => setActiveTab('policy')} className={cn("px-6 py-2.5 rounded-xl text-xs font-bold uppercase", activeTab === 'policy' ? "bg-white text-primary shadow-sm" : "text-slate-500")}>
          <Calendar className="w-4 h-4 inline mr-2" /> Leave Policy
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'file' ? (
          <motion.div key="file" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-panel p-8 md:p-10 border border-white/40 shadow-2xl bg-white/30 backdrop-blur-md rounded-3xl">
            <h2 className="text-xl font-bold mb-8 text-slate-900 uppercase tracking-tight">Request Time Off</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold">
                  <AlertCircle className="w-4 h-4" /> {errorMsg}
                </div>
              )}

              <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 text-amber-800 text-[11px] font-bold leading-relaxed shadow-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="uppercase tracking-wider">Policy Notice:</span> Annual leaves must be submitted at least 14 days in advance. Sick leaves exceeding 3 days require a doctor's certificate upon return.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Start Date</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      min={getMinStartDate()}
                      value={formData.start_date} 
                      onChange={e => setFormData({...formData, start_date: e.target.value})}
                      className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all appearance-none" 
                      required 
                    />
                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">End Date</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      min={formData.start_date || new Date().toISOString().split("T")[0]}
                      value={formData.end_date} 
                      onChange={e => setFormData({...formData, end_date: e.target.value})}
                      className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all appearance-none" 
                      required 
                    />
                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <BeautifulSelect 
                label="Leave Type"
                value={formData.leave_type}
                options={leaveOptions}
                onChange={(val: string) => setFormData({...formData, leave_type: val})}
              />

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Reason</label>
                <textarea rows={4} value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-4 text-sm font-bold outline-none resize-none focus:ring-4 focus:ring-primary/5 transition-all" placeholder="Provide a brief reason for your leave..." required />
              </div>

              <button type="submit" disabled={fileMutation.isPending} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex justify-center items-center gap-2 shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-70">
                {fileMutation.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                {fileMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-panel overflow-hidden border border-white/40 shadow-2xl bg-white/30 backdrop-blur-md rounded-3xl">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-white/40 text-left border-b border-white/10">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Type</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Duration</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {isLoading ? (
                    <tr><td colSpan={3} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-50" /></td></tr>
                  ) : myLeaves.length === 0 ? (
                    <tr><td colSpan={3} className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">No leave applications found</td></tr>
                  ) : (
                    myLeaves.map((leave: any) => (
                      <tr key={leave.id} className="hover:bg-white/40 transition-colors group align-top">
                        <td className="py-5 px-6">
                          <div className="font-bold text-slate-800 text-xs uppercase tracking-tight">{leave.leave_type}</div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Applied: {formatDate(leave.created_at)}</div>
                        </td>
                        <td className="py-5 px-6">
                          <div className="text-xs font-bold text-slate-700">{calculateTotalDays(leave.start_date, leave.end_date)} Days</div>
                          <div className="text-[9px] font-black text-slate-400 uppercase italic tracking-widest mt-0.5">
                            {leave.start_date} to {leave.end_date}
                          </div>
                        </td>
                        <td className="py-5 px-6 text-right">
                          <div className="flex flex-col items-end justify-center gap-1">
                            <StatusBadge status={leave.status} />
                            {leave.status !== 'pending' && leave.approved_at && (
                              <div className="flex flex-col items-end mt-1">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">By: {leave.approver_name || 'Manager'}</span>
                                <span className="text-[8px] font-bold text-slate-400">{formatDate(leave.approved_at)}</span>
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
        ) : activeTab === 'policy' ? (
          <motion.div key="policy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-panel p-8 md:p-10 border border-white/40 shadow-2xl bg-white/30 backdrop-blur-md rounded-3xl">
            <h2 className="text-xl font-bold mb-6 text-slate-900 uppercase tracking-tight">Company Leave Policy</h2>
            <div className="prose prose-sm md:prose-base max-w-none text-slate-700 whitespace-pre-wrap font-medium">
              {policyData?.policy || 'Loading policy...'}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function BalanceCard({ title, days, icon: Icon, color }: any) {
  return (
    <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white/40 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={cn("p-3 rounded-2xl bg-white shadow-inner", color)}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
          <p className="text-2xl font-bold text-slate-900">
            {days} <span className="text-xs text-slate-500 font-medium lowercase">Days Left</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function BeautifulSelect({ label, value, options, onChange }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt: any) => opt.value === value);

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-4 text-sm font-bold flex items-center justify-between cursor-pointer hover:bg-white transition-all shadow-sm",
          isOpen && "ring-4 ring-primary/5 border-primary/20 bg-white"
        )}
      >
        <span className={cn(selectedOption ? "text-slate-900" : "text-slate-400")}>
          {selectedOption ? selectedOption.label : "Select type..."}
        </span>
        <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-300", isOpen && "rotate-180 text-primary")} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-[100] w-full mt-2 bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-2xl overflow-hidden p-2"
          >
            {options.map((opt: any) => (
              <div 
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={cn(
                  "px-4 py-3.5 rounded-xl text-sm font-bold cursor-pointer transition-all mb-1 last:mb-0",
                  value === opt.value 
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" 
                    : "hover:bg-primary/5 text-slate-600 hover:text-primary"
                )}
              >
                {opt.label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}