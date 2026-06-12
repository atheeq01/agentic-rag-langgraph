import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from './Modal';

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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
    >
      <div className="flex flex-col items-center text-center pb-2">
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-500",
          variant === 'danger' 
            ? "bg-rose-50 dark:bg-rose-500/10 text-rose-500" 
            : "bg-amber-50 dark:bg-amber-500/10 text-amber-500"
        )}>
          {variant === 'danger' ? (
            <Trash2 className="w-8 h-8" />
          ) : (
            <AlertTriangle className="w-8 h-8" />
          )}
        </div>
        
        <p className="text-sm font-medium text-muted-foreground leading-relaxed mb-6">
          {message}
        </p>

        <div className="flex flex-col sm:flex-row w-full gap-3 mt-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-50 order-2 sm:order-1"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 order-1 sm:order-2",
              variant === 'danger'
                ? "bg-rose-500 hover:bg-rose-600"
                : "bg-amber-500 hover:bg-amber-600"
            )}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
