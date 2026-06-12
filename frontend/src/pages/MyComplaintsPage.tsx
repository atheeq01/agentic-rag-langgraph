import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Easing } from 'framer-motion';
import { 
  Plus, Flag, Loader2, AlertCircle, MessageSquare, 
  CheckCircle2, Clock, ChevronDown, ArrowRight 
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Select } from '@/components/ui/Select';

const EASE: Easing = 'easeOut';
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: EASE },
});

interface Complaint {
  id: string;
  title: string;
  description: string;
  department: string;
  status: string;
  priority: string;
  created_at: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    resolved: 'badge-resolved', pending: 'badge-pending', open: 'badge-open'
  };
  const dot: Record<string, string> = {
    resolved: 'bg-emerald-500', pending: 'bg-amber-500', open: 'bg-orange-500'
  };
  const s = status.toLowerCase();
  return (
    <span className={`badge ${map[s] ?? 'badge-open'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[s] ?? 'bg-slate-400'}`} />
      <span className="capitalize">{status}</span>
    </span>
  );
}

export default function MyComplaintsPage() {
  const [activeTab, setActiveTab] = useState<'file' | 'history'>('file');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    title: '', description: '', department: 'HR', is_anonymous: false, priority: 'medium'
  });
  const [errorMsg, setErrorMsg] = useState('');
  const queryClient = useQueryClient();

  const { data: myComplaints, isLoading } = useQuery({
    queryKey: ['complaints', 'me'],
    queryFn: () => api.get('/complaints/me').then(res => res.data)
  });

  const fileMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/complaints/', {
      ...data, against_user_id: null
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['complaints', 'me'] });
      setActiveTab('history');
      setFormData({ title: '', description: '', department: 'HR', is_anonymous: false, priority: 'medium' });
      setErrorMsg('');
    },
    onError: (err: any) => {
      const message = err.response?.data?.detail;
      const displayError = Array.isArray(message) ? message.map((m: any) => m.msg).join(", ") : message;
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

  const fmt = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const tabs = [
    { id: 'file' as const,    label: 'File New', icon: Plus },
    { id: 'history' as const, label: 'My Cases', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div {...fadeUp()}>
        <h1 className="text-xl font-bold text-foreground">Grievance Portal</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Submit and track your complaints or suggestions securely.</p>
      </motion.div>

      {/* Tab bar */}
      <motion.div {...fadeUp(0.05)} className="flex gap-1 p-1 bg-secondary rounded-xl w-fit">
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

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'file' && (
          <motion.div key="file" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25, ease: EASE }}
            className="card p-6 max-w-2xl">
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <Flag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">New Grievance</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Submit your concern for internal review</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <AnimatePresence>
                {errorMsg && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Title / Subject</label>
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="input w-full" 
                  placeholder="Brief summary of the issue" 
                  required 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Select 
                    label="Target Department"
                    value={formData.department}
                    onChange={(val) => setFormData({...formData, department: val})}
                    options={[
                      { value: 'HR', label: 'HR' },
                      { value: 'Operations', label: 'Operations' },
                      { value: 'Technical', label: 'Technical' },
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <Select 
                    label="Priority Level"
                    value={formData.priority}
                    onChange={(val) => setFormData({...formData, priority: val})}
                    options={[
                      { value: 'low', label: 'Low Priority' },
                      { value: 'medium', label: 'Medium Priority' },
                      { value: 'high', label: 'High Priority' },
                    ]}
                  />
                </div>

                <div className="md:col-span-2 flex items-end pb-1 md:justify-end">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={formData.is_anonymous}
                        onChange={e => setFormData({...formData, is_anonymous: e.target.checked})}
                      />
                      <div className={`w-10 h-6 rounded-full transition-colors duration-200 ${formData.is_anonymous ? 'bg-primary' : 'bg-secondary'}`} />
                      <div className={`absolute left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${formData.is_anonymous ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-sm font-semibold text-foreground group-hover:opacity-80 transition-opacity">
                      Submit Anonymously
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Detailed Description</label>
                <textarea 
                  rows={5} 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="input w-full resize-none" 
                  placeholder="Please describe the situation in detail..." 
                  required 
                />
              </div>

              <button 
                type="submit" 
                disabled={fileMutation.isPending} 
                className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {fileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                {fileMutation.isPending ? 'Filing Case...' : 'Submit Grievance'}
              </button>
            </form>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25, ease: EASE }}
            className="table-wrapper">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground leading-tight">My Cases</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Track the progress of your submitted grievances</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="table-header py-2.5 px-5 text-left">Subject</th>
                    <th className="table-header py-2.5 px-5 text-left hidden sm:table-cell">Dept</th>
                    <th className="table-header py-2.5 px-5 text-left">Description</th>
                    <th className="table-header py-2.5 px-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" /></td></tr>
                  ) : !Array.isArray(myComplaints) || myComplaints.length === 0 ? (
                    <tr><td colSpan={4} className="py-16 text-center">
                      <MessageSquare className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-30" />
                      <p className="text-sm text-muted-foreground">No cases found.</p>
                      <button onClick={() => setActiveTab('file')} className="mt-3 text-xs text-primary font-semibold hover:underline flex items-center gap-1 mx-auto">
                        File a grievance <ArrowRight className="w-3 h-3" />
                      </button>
                    </td></tr>
                  ) : (
                    myComplaints.map((comp: Complaint) => (
                      <tr key={comp.id} className="table-row align-top">
                        <td className="py-4 px-5">
                          <div className="flex items-start gap-2.5">
                            <Flag className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground text-sm truncate">{comp.title || 'No Title'}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">ID: {comp.id.substring(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5 hidden sm:table-cell">
                          <span className="text-xs font-medium text-muted-foreground block">{comp.department || 'General'}</span>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            comp.priority === 'high' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                            comp.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                          }`}>
                            {comp.priority || 'medium'}
                          </span>
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
                           <div className="flex flex-col items-end gap-1">
                             <StatusBadge status={comp.status} />
                             <p className="text-[10px] text-muted-foreground">{fmt(comp.created_at)}</p>
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
      </AnimatePresence>
    </div>
  );
}
