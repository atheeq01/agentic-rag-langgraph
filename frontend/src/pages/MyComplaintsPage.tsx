import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Flag, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Complaint {
  id: string;
  title: string;
  description: string;
  department: string;
  status: string;
}

export default function MyComplaintsPage() {
  const [activeTab, setActiveTab] = useState<'file' | 'history'>('file');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    department: 'HR',
    is_anonymous: false 
  });
  const [errorMsg, setErrorMsg] = useState('');
  const queryClient = useQueryClient();

  const { data: myComplaints, isLoading } = useQuery({
    queryKey: ['complaints', 'me'],
    queryFn: () => api.get('/complaints/me').then(res => res.data)
  });

  const fileMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/complaints/', {
      ...data,
      priority: "medium",
      against_user_id: null
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['complaints', 'me'] });
      setActiveTab('history');
      setFormData({ title: '', description: '', department: 'HR', is_anonymous: false });
      setErrorMsg('');
    },
    onError: (err: any) => {
      const message = err.response?.data?.detail;
      const displayError = Array.isArray(message) 
        ? message.map((m: any) => m.msg).join(", ") 
        : message;
      setErrorMsg(displayError || 'Failed to submit grievance.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
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
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 leading-tight">Grievance Portal</h1>
        <p className="text-sm md:text-base text-slate-500">Submit and track your complaints or suggestions securely.</p>
      </div>

      <div className="flex gap-1 p-1 bg-white/40 backdrop-blur-md border border-white/20 rounded-2xl w-fit max-w-full overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('file')} 
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 text-xs md:text-sm font-bold whitespace-nowrap uppercase tracking-widest",
            activeTab === 'file' ? "bg-white text-primary shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-900 hover:bg-white/40"
          )}
        >
          <Plus className="w-4 h-4" /> File New
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 text-xs md:text-sm font-bold whitespace-nowrap uppercase tracking-widest",
            activeTab === 'history' ? "bg-white text-primary shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-900 hover:bg-white/40"
          )}
        >
          <MessageSquare className="w-4 h-4" /> My Cases
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'file' ? (
          <motion.div 
            key="file" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            className="glass-panel p-6 md:p-10 max-w-2xl border border-white/40 shadow-2xl"
          >
             <div className="flex items-center gap-4 mb-8 md:mb-10">
              <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                <Flag className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-none mb-1">New Grievance</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Submit your concern for internal review</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </motion.div>
              )}
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 italic">Title / Subject</label>
                <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-white/50 border border-slate-200 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all rounded-xl px-4 py-3.5 text-sm font-bold outline-none" placeholder="Brief summary of the issue" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 italic">Target Department</label>
                  <div className="relative">
                    <select 
                      value={formData.department} 
                      onChange={e => setFormData({...formData, department: e.target.value})} 
                      className="custom-select w-full"
                    >
                      <option>HR</option>
                      <option>Operations</option>
                      <option>Technical</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-end pb-1 px-1">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={formData.is_anonymous}
                        onChange={e => setFormData({...formData, is_anonymous: e.target.checked})}
                      />
                      <div className={cn(
                        "w-10 h-6 rounded-full transition-colors duration-200",
                        formData.is_anonymous ? "bg-rose-500" : "bg-slate-200"
                      )} />
                      <div className={cn(
                        "absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200",
                        formData.is_anonymous && "translate-x-4"
                      )} />
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-700">
                      Submit Anonymously
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 italic">Detailed Description</label>
                <textarea rows={6} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white/50 border border-slate-200 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all rounded-xl px-4 py-3.5 text-sm font-bold outline-none resize-none placeholder:text-slate-300 placeholder:italic" placeholder="Please describe the situation in detail..." required></textarea>
              </div>

              <button type="submit" disabled={fileMutation.isPending} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl hover:bg-slate-800 transition-all active:scale-[0.98] mt-4 flex justify-center items-center gap-2 disabled:opacity-70">
                {fileMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Flag className="w-5 h-5" />}
                {fileMutation.isPending ? 'Filing Case...' : 'Submit Grievance'}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-panel overflow-hidden border border-white/40 shadow-2xl">
            <div className="p-6 border-b border-white/20 bg-white/30 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-none mb-1">My Cases</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Track the progress of your submitted grievances</p>
              </div>
            </div>
            
            <div className="w-full overflow-x-auto custom-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/40 text-left border-b border-white/10">
                    <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Subject</th>
                    <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic hidden sm:table-cell">Dept</th>
                    <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Description</th>
                    <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {isLoading ? (
                    <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-50" /></td></tr>
                  ) : !Array.isArray(myComplaints) || myComplaints.length === 0 ? (
                    <tr><td colSpan={4} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] italic">No cases found</td></tr>
                  ) : (
                    myComplaints.map((comp: Complaint) => (
                      <tr key={comp.id} className="transition-colors hover:bg-white/40 group align-top">
                        <td className="py-4 px-4 md:px-6">
                           <div className="flex items-start gap-3 mt-1">
                              <Flag className="w-4 h-4 text-rose-500 shrink-0" />
                              <span className="font-bold text-slate-800 text-xs uppercase leading-tight">{comp.title || 'No Title'}</span>
                           </div>
                        </td>
                        <td className="py-4 px-4 md:px-6 hidden sm:table-cell">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mt-1 block">{comp.department || 'General'}</span>
                        </td>
                        <td className="py-4 px-4 md:px-6 w-full max-w-[200px] md:max-w-xs">
                           <div 
                             className={cn(
                               "text-xs text-slate-600 cursor-pointer transition-all",
                               expandedId === comp.id ? "whitespace-pre-wrap" : "line-clamp-2"
                             )}
                             onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)}
                           >
                             {comp.description}
                           </div>
                           {(comp.description?.length || 0) > 60 && (
                             <span 
                               className="inline-block cursor-pointer text-[9px] font-black text-primary mt-1 uppercase tracking-tighter"
                               onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)}
                             >
                               {expandedId === comp.id ? "Show Less" : "Read More"}
                             </span>
                           )}
                        </td>
                        <td className="py-4 px-4 md:px-6 text-right">
                           <StatusBadge status={comp.status} />
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
