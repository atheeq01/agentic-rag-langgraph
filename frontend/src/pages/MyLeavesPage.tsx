import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Flag, Clock, CheckCircle2, Loader2, AlertCircle, ChevronRight, MessageSquare
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// Define strict interface for Type Safety
interface Complaint {
  id: string;
  title: string;
  description: string;
  department: string;
  status: 'pending' | 'resolved';
}

export default function MyComplaintsPage() {
  const [activeTab, setActiveTab] = useState<'file' | 'history'>('file');
  const [formData, setFormData] = useState({ title: '', description: '', department: 'HR' });
  const [errorMsg, setErrorMsg] = useState('');
  const queryClient = useQueryClient();

  const { data: myComplaints, isLoading } = useQuery<Complaint[]>({
    queryKey: ['complaints', 'me'],
    queryFn: () => api.get('/complaints/me').then(res => res.data)
  });

  const fileMutation = useMutation({
    // FIXED: Payload now matches the backend 'ComplaintCreate' schema
    mutationFn: (data: typeof formData) => api.post('/complaints/', {
      title: data.title,
      description: data.description,
      department: data.department,
      priority: "medium",
      is_anonymous: false
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', 'me'] });
      setActiveTab('history');
      setFormData({ title: '', description: '', department: 'HR' });
      setErrorMsg('');
    },
    onError: (err: any) => {
      // Defensive check for error message to prevent white screen on failure
      setErrorMsg(err.response?.data?.detail || 'An unexpected error occurred.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      setErrorMsg('Title and description are required.');
      return;
    }
    fileMutation.mutate(formData);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      resolved: "bg-emerald-50 text-emerald-700 border-emerald-100",
      pending: "bg-amber-50 text-amber-700 border-amber-100"
    };
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border",
        styles[status] || styles.pending
      )}>
        {status === 'resolved' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Grievance Portal</h1>
        <p className="text-sm text-slate-500">Submit and track your complaints securely.</p>
      </div>

      <div className="flex gap-1 p-1 bg-white/40 backdrop-blur-md border border-white/20 rounded-2xl w-fit">
        <button onClick={() => setActiveTab('file')} className={cn("px-6 py-2.5 rounded-xl text-xs font-bold uppercase", activeTab === 'file' ? "bg-white text-primary shadow-sm" : "text-slate-500")}>
          <Plus className="w-4 h-4 inline mr-2" /> File New
        </button>
        <button onClick={() => setActiveTab('history')} className={cn("px-6 py-2.5 rounded-xl text-xs font-bold uppercase", activeTab === 'history' ? "bg-white text-primary shadow-sm" : "text-slate-500")}>
          <MessageSquare className="w-4 h-4 inline mr-2" /> My Cases
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'file' ? (
          <motion.div key="file" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 border border-white/40 shadow-2xl bg-white/30 backdrop-blur-md rounded-3xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold">
                  <AlertCircle className="w-4 h-4" /> {errorMsg}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Title</label>
                <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Department</label>
                <select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none appearance-none">
                  <option>HR</option><option>Operations</option><option>Technical</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Description</label>
                <textarea rows={5} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none resize-none" required />
              </div>
              <button type="submit" disabled={fileMutation.isPending} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex justify-center items-center gap-2">
                {fileMutation.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : <Flag className="w-5 h-5" />}
                Submit Grievance
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel overflow-hidden border border-white/40 shadow-2xl bg-white/30 backdrop-blur-md rounded-3xl">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-white/40 text-left border-b border-white/10">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Subject</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Department</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {isLoading ? (
                    <tr><td colSpan={3} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
                  ) : !Array.isArray(myComplaints) || myComplaints.length === 0 ? (
                    <tr><td colSpan={3} className="py-20 text-center text-slate-400 font-bold uppercase text-[10px]">No cases found</td></tr>
                  ) : (
                    myComplaints.map((comp) => (
                      <tr key={comp.id} className="hover:bg-white/40 transition-colors">
                        <td className="py-5 px-6 font-bold text-slate-800 text-xs uppercase">{comp.title}</td>
                        <td className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase italic">{comp.department}</td>
                        <td className="py-5 px-6 text-right"><StatusBadge status={comp.status} /></td>
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