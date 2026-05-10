import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  barText?: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ 
  isOpen, onClose, onConfirm, barText 
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-bg-surface border border-quality-low/30 rounded-2xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(239,68,68,0.15)]"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-quality-low/10 rounded-xl border border-quality-low/20">
                <AlertTriangle className="w-6 h-6 text-quality-low" />
              </div>
              <button 
                onClick={onClose}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <h3 className="text-xl font-bold text-text-primary">تأكيد حذف البار</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                هل أنت متأكد من رغبتك في حذف هذا البار؟ لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.
              </p>
              {barText && (
                <div className="p-4 bg-bg-elevated border border-border-default rounded-xl italic text-text-secondary text-sm line-clamp-3">
                  "{barText}"
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-xl text-text-muted font-bold hover:bg-bg-elevated transition-all border border-border-default"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex-1 px-6 py-3 bg-quality-low text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                حذف نهائي
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
