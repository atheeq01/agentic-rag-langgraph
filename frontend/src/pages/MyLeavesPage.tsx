import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Loader2, 
  Calendar, 
  FileText, 
  Plus, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function MyLeavesPage() {
  const [activeTab, setActiveTab] = useState<'apply' | 'history'>('apply');
  const [formData, setFormData] = useState({ start_date: '', end_date: '', leave_type: 'Sick', reason: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const queryClient = useQueryClient();

  const { data: myLeaves, isLoading } = useQuery({
    queryKey: ['leaves', 'me'],
    queryFn: () => api.get('/leaves/me').then(res => res.data)
  });

  const applyMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/leaves/apply', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves', 'me'] });
      setActiveTab('history');
      setFormData({ start_date: '', end_date: '', leave_type: 'Sick', reason: '' });
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Failed to submit leave application.');
    }
  });

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!formData.start_date || !formData.end_date || !formData.reason) {
      setErrorMsg('All fields are required.');
      return;
    }
    if (formData.end_date <= formData.start_date) {
      setErrorMsg('End date must be after start date.');
      return;
    }
    applyMutation.mutate(formData);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
      rejected: "bg-rose-50 text-rose-700 border-rose-100",
      pending: "bg-amber-50 text-amber-700 border-amber-100"
    };
    
    const icons: Record<string, any> = {
      approved: CheckCircle2,
      rejected: XCircle,
      pending: Clock
    };
    
    const Icon = icons[status] || Clock;
    
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border",
        styles[status] || styles.pending
      )}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-5xl mx-auto w-full max-w-full">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 leading-tight">Leave Management</h1>
        <p className="text-sm md:text-base text-slate-500">Apply for time off and track your request history.</p>
      </div>

      <div className="flex gap-1 p-1 bg-white/40 backdrop-blur-md border border-white/20 rounded-2xl w-fit max-w-full overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('apply')} 
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 text-xs md:text-sm font-bold whitespace-nowrap uppercase tracking-widest",
            activeTab === 'apply' ? "bg-white text-primary shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-900 hover:bg-white/40"
          )}
        >
          <Plus className="w-4 h-4" /> Apply Leave
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 text-xs md:text-sm font-bold whitespace-nowrap uppercase tracking-widest",
            activeTab === 'history' ? "bg-white text-primary shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-900 hover:bg-white/40"
          )}
        >
          <Calendar className="w-4 h-4" /> History
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'apply' ? (
          <motion.div 
            key="apply" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            className="glass-panel p-6 md:p-10 max-w-2xl border border-white/40 shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-8 md:mb-10">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-none mb-1">New Application</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Complete the form to request time off</p>
              </div>
            </div>

            <form onSubmit={handleApply} className="space-y-6">
              {errorMsg && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </motion.div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 italic">Start Date</label>
                  <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full bg-white/50 border border-slate-200 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all rounded-xl px-4 py-3.5 text-sm font-bold outline-none" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 italic">End Date</label>
                  <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full bg-white/50 border border-slate-200 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all rounded-xl px-4 py-3.5 text-sm font-bold outline-none" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 italic">Type of Leave</label>
                <div className="relative">
                  <select 
                    value={formData.leave_type} 
                    onChange={e => setFormData({...formData, leave_type: e.target.value})} 
                    className="w-full bg-white/50 border border-slate-200 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all rounded-xl px-4 py-3.5 text-sm font-bold outline-none appearance-none cursor-pointer"
                  >
                    <option>Sick</option>
                    <option>Vacation</option>
                    <option>Personal</option>
                  </select>
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 italic">Reason / Comments</label>
                <textarea rows={4} value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full bg-white/50 border border-slate-200 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all rounded-xl px-4 py-3.5 text-sm font-bold outline-none resize-none placeholder:text-slate-300 placeholder:italic" placeholder="Please provide details for your request..." required></textarea>
              </div>

              <button type="submit" disabled={applyMutation.isPending} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl hover:bg-slate-800 transition-all active:scale-[0.98] mt-4 flex justify-center items-center gap-2 disabled:opacity-70">
                {applyMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                {applyMutation.isPending ? 'Processing...' : 'Submit Application'}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-panel overflow-hidden border border-white/40 shadow-2xl">
            <div className="p-6 border-b border-white/20 bg-white/30 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-none mb-1">My History</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">All your recent leave requests</p>
              </div>
            </div>
            
            <div className="w-full overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-white/40 text-left border-b border-white/10">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Type</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Duration</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Explanation</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {isLoading ? (
                    <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-50" /></td></tr>
                  ) : !myLeaves || myLeaves.length === 0 ? (
                    <tr><td colSpan={4} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] italic">No leave history found</td></tr>
                  ) : (
                    myLeaves.map((leave: any) => (
                      <tr key={leave.id} className="transition-colors hover:bg-white/40 group">
                        <td className="py-5 px-6">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                                 <FileText className="w-4 h-4" />
                              </div>
                              <span className="font-black text-slate-800 text-xs uppercase tracking-tight">{leave.leave_type}</span>
                           </div>
                        </td>
                        <td className="py-5 px-6">
                           <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-900">{leave.start_date}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">to {leave.end_date}</span>
                           </div>
                        </td>
                        <td className="py-5 px-6">
                           <p className="text-xs text-slate-600 font-medium truncate max-w-[200px]">{leave.reason}</p>
                        </td>
                        <td className="py-5 px-6 text-right">
                           <StatusBadge status={leave.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
