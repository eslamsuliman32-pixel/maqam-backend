import React from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  barText?: string;
}

export function DeleteConfirmationModal({ isOpen, onClose, onConfirm, barText }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 450, damping: 38 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div className="bg-[#0D1017] border border-red-500/15 rounded-3xl w-full max-w-md shadow-2xl shadow-black/50 pointer-events-auto overflow-hidden">
              
              {/* Red top accent */}
              <div className="h-0.5 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

              <div className="p-7">
                {/* Icon */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-2xl bg-red-500/10 border border-red-500/20" />
                    <div className="absolute inset-0 rounded-2xl bg-red-500/5 blur-xl" />
                    <div className="relative flex items-center justify-center w-full h-full">
                      <Trash2 className="w-7 h-7 text-red-400" />
                    </div>
                  </div>
                </div>

                {/* Text */}
                <div className="text-center mb-6">
                  <h3 className="text-lg font-black text-white mb-2 tracking-tight">حذف البار</h3>
                  <p className="text-white/40 text-sm">هذا الإجراء لا يمكن التراجع عنه</p>
                </div>

                {/* Bar Preview */}
                {barText && (
                  <div className="relative mb-6 p-4 bg-red-500/[0.05] border border-red-500/10 rounded-xl">
                    <AlertTriangle className="absolute top-3 left-3 w-3 h-3 text-red-400/40" />
                    <p dir="rtl" className="text-white/40 text-sm leading-relaxed line-clamp-2 pr-1">{barText}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/40 text-sm font-bold hover:bg-white/[0.08] hover:text-white/60 transition-all"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={onConfirm}
                    className="flex-1 py-3 rounded-xl bg-red-500/90 text-white text-sm font-black uppercase tracking-wider hover:bg-red-400 transition-colors shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
