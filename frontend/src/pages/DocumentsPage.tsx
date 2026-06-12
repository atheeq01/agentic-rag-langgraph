import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Easing } from 'framer-motion';
import { 
  Search, FileText, Loader2, Trash2,
  AlertCircle, FileUp
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

const EASE: Easing = 'easeOut';
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: EASE },
});

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [docToDelete, setDocToDelete] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.get('/documents/').then(res => res.data)
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
      setErrorMsg('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Failed to upload document.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    }
  });

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg('');
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setErrorMsg('Only PDF files are supported.'); return; }
    const formData = new FormData();
    formData.append('file', file);
    uploadMutation.mutate(formData);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setErrorMsg('Only PDF files are supported.'); return; }
    const formData = new FormData();
    formData.append('file', file);
    uploadMutation.mutate(formData);
  };

  const filteredDocs = documents.filter((doc: any) => 
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 md:space-y-8 max-w-5xl mx-auto w-full">
      <motion.div {...fadeUp()}>
        <h1 className="text-xl font-bold text-foreground leading-tight">Document Repository</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Securely upload and manage company PDF files.</p>
      </motion.div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} 
            className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div {...fadeUp(0.05)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploadMutation.isPending && fileInputRef.current?.click()}
        className={cn(
          "relative overflow-hidden w-full rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-10 md:p-14 text-center group bg-card",
          isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50",
          uploadMutation.isPending && "opacity-60 cursor-not-allowed pointer-events-none"
        )}
      >
        <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
        
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-500",
          isDragging ? "bg-primary text-white scale-110 shadow-lg shadow-primary/20" : "bg-primary/10 text-primary group-hover:scale-110"
        )}>
          {uploadMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileUp className="w-6 h-6" />}
        </div>
        
        <h3 className="text-base font-semibold text-foreground mb-1">
          {uploadMutation.isPending ? 'Uploading Document...' : 'Drag & Drop your PDF here'}
        </h3>
        <p className="text-xs text-muted-foreground">or click to browse files</p>
      </motion.div>

      <motion.div {...fadeUp(0.1)} className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="Search documents by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input w-full !pl-11 py-3"
        />
      </motion.div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center">
           <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
           <p className="text-sm font-medium text-muted-foreground">Loading Repository...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredDocs.map((doc: any) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={doc.id}
                className="card p-5 group hover:border-primary/30 transition-all flex flex-col justify-between"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 text-blue-600 transition-transform group-hover:scale-110">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {doc.filename.replace('.pdf', '')}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="w-full pt-4 border-t border-border">
                  <button 
                    onClick={() => setDocToDelete(doc)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === doc.id}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 rounded-lg transition-colors disabled:opacity-50 text-xs font-semibold"
                  >
                    {deleteMutation.isPending && deleteMutation.variables === doc.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {!isLoading && filteredDocs.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-border rounded-2xl bg-secondary/50">
              <Search className="w-8 h-8 text-muted-foreground opacity-50 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-muted-foreground">No documents found</h3>
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
          if (docToDelete) deleteMutation.mutate(docToDelete.id, { onSuccess: () => setDocToDelete(null) });
        }}
        onClose={() => setDocToDelete(null)}
        isLoading={deleteMutation.isPending}
        variant="danger"
      />
    </div>
  );
}