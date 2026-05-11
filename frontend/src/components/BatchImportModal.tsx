import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepositoryStore } from '../store/repositoryStore';

interface Props { isOpen: boolean; onClose: () => void; }

type Stage = 'idle' | 'preview' | 'importing' | 'done';

export function BatchImportModal({ isOpen, onClose }: Props) {
  const [text,    setText]    = useState('');
  const [bars,    setBars]    = useState<string[]>([]);
  const [stage,   setStage]   = useState<Stage>('idle');
  const [dragging, setDrag]   = useState(false);
  const fileRef               = useRef<HTMLInputElement>(null);
  const { addBar }            = useRepositoryStore();

  const parseText = (raw: string) => {
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    setBars(lines);
    setStage('preview');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => parseText(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setStage('importing');
    for (let i = 0; i < bars.length; i++) {
      await new Promise(r => setTimeout(r, 60));
      addBar({ text: bars[i], tags: [], rating: 0, dialect: 'fusha' });
    }
    setStage('done');
  };

  const handleClose = () => {
    setText(''); setBars([]); setStage('idle');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div className="bg-[#0D1017] border border-white/[0.07] rounded-3xl w-full max-w-2xl shadow-2xl shadow-black/50 pointer-events-auto overflow-hidden">
              
              {/* Header */}
              <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.05]">
                <div>
                  <h2 className="text-base font-black text-white tracking-tight">BATCH_IMPORT</h2>
                  <p className="text-[10px] text-white/25 mt-0.5 uppercase tracking-widest">استيراد أسطر متعددة دفعة واحدة</p>
                </div>
                <button onClick={handleClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-7">
                <AnimatePresence mode="wait">

                  {/* ── Idle ── */}
                  {stage === 'idle' && (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                      
                      {/* Drop Zone */}
                      <div
                        onDragOver={e => { e.preventDefault(); setDrag(true); }}
                        onDragLeave={() => setDrag(false)}
                        onDrop={handleDrop}
                        onClick={() => fileRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                          dragging ? 'border-amber-500/50 bg-amber-500/5' : 'border-white/[0.08] hover:border-amber-500/20 hover:bg-amber-500/[0.02]'
                        }`}
                      >
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                          <Upload className="w-6 h-6 text-amber-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-white/60 text-sm font-bold">اسحب ملف .txt هنا</p>
                          <p className="text-white/20 text-[11px] mt-1">أو انقر للاختيار</p>
                        </div>
                        <input ref={fileRef} type="file" accept=".txt" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => parseText(ev.target?.result as string); r.readAsText(f); }}} />
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/[0.05]" />
                        <span className="text-[10px] text-white/20 uppercase tracking-wider">أو الصق النص</span>
                        <div className="h-px flex-1 bg-white/[0.05]" />
                      </div>

                      <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="الصق أسطرك هنا — سطر واحد لكل بار..."
                        dir="rtl"
                        rows={6}
                        className="w-full bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 text-sm text-white/60 placeholder:text-white/15 focus:outline-none focus:border-amber-500/20 resize-none"
                      />

                      <button
                        onClick={() => parseText(text)}
                        disabled={!text.trim()}
                        className="w-full py-3 rounded-xl bg-amber-500/90 text-black text-sm font-black uppercase tracking-wider hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                      >
                        <ChevronRight className="w-4 h-4" />
                        معاينة
                      </button>
                    </motion.div>
                  )}

                  {/* ── Preview ── */}
                  {stage === 'preview' && (
                    <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">معاينة — {bars.length} سطر</span>
                        </div>
                        <button onClick={() => setStage('idle')} className="text-[10px] text-white/25 hover:text-white/50 transition-colors">← رجوع</button>
                      </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {bars.map((bar, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                            <span className="text-[9px] font-mono text-white/20 mt-0.5 w-5 shrink-0">{i + 1}</span>
                            <p dir="rtl" className="text-sm text-white/60 leading-relaxed">{bar}</p>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleImport}
                        className="w-full py-3 rounded-xl bg-amber-500/90 text-black text-sm font-black uppercase tracking-wider hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
                      >
                        استيراد {bars.length} سطر
                      </button>
                    </motion.div>
                  )}

                  {/* ── Importing ── */}
                  {stage === 'importing' && (
                    <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-12 gap-5">
                      <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-2 border-amber-500/20" />
                        <div className="absolute inset-0 rounded-full border-t-2 border-amber-400 animate-spin" />
                        <Upload className="absolute inset-0 m-auto w-6 h-6 text-amber-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-white/60 font-bold text-sm">جاري الاستيراد...</p>
                        <p className="text-white/20 text-[11px] mt-1">{bars.length} سطر</p>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Done ── */}
                  {stage === 'done' && (
                    <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-12 gap-5">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-white/80 font-black text-base">تم الاستيراد بنجاح!</p>
                        <p className="text-white/25 text-[11px] mt-1">تمت إضافة {bars.length} سطر إلى المستودع</p>
                      </div>
                      <button onClick={handleClose} className="px-8 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-bold hover:bg-emerald-500/30 transition-colors">
                        إغلاق
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
