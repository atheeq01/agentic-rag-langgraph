import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  FileText, 
  Loader2, 
  Trash2,
  AlertCircle,
  FileUp
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [docToDelete, setDocToDelete] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // 1. Fetch Documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.get('/documents/').then(res => res.data)
  });

  // 2. Upload Document Mutation
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setErrorMsg('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Failed to upload document.');
    }
  });

  // 3. Delete Document Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    }
  });

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg('');

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setErrorMsg('Only PDF files are supported.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    uploadMutation.mutate(formData);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setErrorMsg('Only PDF files are supported.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    uploadMutation.mutate(formData);
  };

  // Search Filter
  const filteredDocs = documents.filter((doc: any) => 
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 md:space-y-8 max-w-5xl mx-auto w-full max-w-full">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 leading-tight">Document Repository</h1>
        <p className="text-sm md:text-base text-slate-500">Securely upload and manage company PDF files.</p>
      </div>

      {errorMsg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0" /> {errorMsg}
        </motion.div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploadMutation.isPending && fileInputRef.current?.click()}
        className={cn(
          "relative overflow-hidden w-full rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-10 md:p-14 text-center group bg-white/40 backdrop-blur-sm",
          isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-slate-300 hover:border-primary/50 hover:bg-white/60",
          uploadMutation.isPending && "opacity-70 cursor-not-allowed pointer-events-none"
        )}
      >
        <input 
          type="file" 
          accept=".pdf" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          className="hidden" 
        />
        
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-500",
          isDragging ? "bg-primary text-white scale-110 shadow-xl shadow-primary/20" : "bg-primary/10 text-primary group-hover:scale-110"
        )}>
          {uploadMutation.isPending ? <Loader2 className="w-8 h-8 animate-spin" /> : <FileUp className="w-8 h-8" />}
        </div>
        
        <h3 className="text-lg font-bold text-slate-900 mb-1">
          {uploadMutation.isPending ? 'Uploading Document...' : 'Drag & Drop your PDF here'}
        </h3>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">
          or click to browse files
        </p>
      </div>

      {/* Simplified Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="Search documents by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl focus:outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all font-bold text-sm shadow-sm text-slate-800"
        />
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center text-primary/50">
           <Loader2 className="w-10 h-10 animate-spin mb-4" />
           <p className="text-xs font-black uppercase tracking-widest">Loading Repository...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          <AnimatePresence mode="popLayout">
            {filteredDocs.map((doc: any) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                key={doc.id}
                className="glass-panel p-5 border border-white/40 shadow-lg hover:shadow-xl group hover:border-primary/20 transition-all flex flex-col justify-between bg-white/40"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-primary transition-colors break-words line-clamp-2">
                      {doc.filename.replace('.pdf', '')}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="w-full pt-4 border-t border-white/30">
                  <button 
                    onClick={() => setDocToDelete(doc)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === doc.id}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors border border-rose-100/50 disabled:opacity-70 text-[10px] font-black uppercase tracking-widest"
                  >
                    {deleteMutation.isPending && deleteMutation.variables === doc.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete Document
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {!isLoading && filteredDocs.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white/20">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic">No documents found</h3>
            </div>
          )}
        </div>
      )}
      <ConfirmationModal
        isOpen={!!docToDelete}
        title="Delete Document"
        message={`Are you sure you want to permanently delete "${docToDelete?.filename}"? This action cannot be undone.`}
        confirmLabel="Delete Document"
        onConfirm={() => {
          if (docToDelete) {
            deleteMutation.mutate(docToDelete.id, {
              onSuccess: () => setDocToDelete(null)
            });
          }
        }}
        onClose={() => setDocToDelete(null)}
        isLoading={deleteMutation.isPending}
        variant="danger"
      />
    </div>
  );
}