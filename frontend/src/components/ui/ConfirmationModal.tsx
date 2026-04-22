import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  variant?: 'danger' | 'warning';
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
  variant = 'danger',
  isLoading = false
}: ConfirmationModalProps) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200]"
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 pointer-events-auto"
            >
              <div className="p-8 pb-6 flex flex-col items-center text-center">
                <div className={cn(
                  "w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl transition-transform duration-500",
                  variant === 'danger' 
                    ? "bg-rose-50 text-rose-500 shadow-rose-200/50" 
                    : "bg-amber-50 text-amber-500 shadow-amber-200/50"
                )}>
                  {variant === 'danger' ? (
                    <Trash2 className="w-10 h-10" />
                  ) : (
                    <AlertTriangle className="w-10 h-10" />
                  )}
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight leading-tight">
                  {title}
                </h3>
                <p className="text-sm font-bold text-slate-400 leading-relaxed italic">
                  {message}
                </p>
              </div>

              <div className="p-8 pt-0 flex flex-col gap-3">
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all duration-300 shadow-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50",
                    variant === 'danger'
                      ? "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200/40"
                      : "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200/40"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  {confirmLabel}
                </button>
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-300 active:scale-95"
                >
                  {cancelLabel}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
