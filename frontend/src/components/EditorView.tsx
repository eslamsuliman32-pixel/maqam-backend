import React, { useState, useRef, useEffect } from 'react';
import {
  Mic2, Wand2, BrainCircuit, ChevronRight, Sparkles,
  AudioWaveform, Send, Save, RefreshCw, Target, Hash,
  Volume2, Play, Pause, Loader2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioUploader } from './AudioUploader';
import { geminiService } from '../services/geminiService';
import { moraEngine } from '../services/moraEngine';
import { useRepositoryStore } from '../store/repositoryStore';

const QUICK_ACTIONS = [
  { id: 'rhyme',    icon: Hash,        label: 'قافية',        desc: 'اقتراح قوافي' },
  { id: 'flow',     icon: AudioWaveform, label: 'فلو',        desc: 'تحليل الإيقاع' },
  { id: 'enhance',  icon: Wand2,       label: 'تحسين',        desc: 'رفع جودة البار' },
  { id: 'multi',    icon: Sparkles,    label: 'متعدد',        desc: 'خيارات بديلة' },
];

export function EditorView() {
  const [text, setText]             = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [activeAction, setAction]   = useState<string | null>(null);
  const [charCount, setCharCount]   = useState(0);
  const textareaRef                 = useRef<HTMLTextAreaElement>(null);
  const { addBar }                  = useRepositoryStore();

  useEffect(() => { setCharCount(text.length); }, [text]);

  const handleAction = async (actionId: string) => {
    if (!text.trim()) return;
    setAction(actionId);
    setIsLoading(true);
    setAiResponse('');
    try {
      const prompt = buildPrompt(actionId, text);
      const res = await geminiService.generateContent(prompt);
      setAiResponse(res);
    } catch {
      setAiResponse('حدث خطأ. تحقق من الاتصال وحاول مجدداً.');
    } finally {
      setIsLoading(false);
    }
  };

  const buildPrompt = (action: string, bar: string) => {
    const map: Record<string, string> = {
      rhyme:   `أنت منتج راب عربي محترف. اقترح 5 قوافي إبداعية لهذا البار:\n"${bar}"`,
      flow:    `حلل إيقاع وفلو هذا البار الراب العربي وأعطِ نقاطاً للتحسين:\n"${bar}"`,
      enhance: `حسّن هذا البار الراب العربي مع الحفاظ على المعنى والروح الأصلية:\n"${bar}"`,
      multi:   `قدم 3 بدائل إبداعية مختلفة لهذا البار الراب العربي:\n"${bar}"`,
    };
    return map[action] ?? '';
  };

  const handleSaveBar = () => {
    if (!text.trim()) return;
    addBar({ text: text.trim(), tags: [], rating: 0, dialect: 'fusha' });
    setText('');
    setAiResponse('');
    setAction(null);
  };

  const moraData = text ? moraEngine.analyze(text) : null;

  return (
    <div className="grid grid-cols-12 gap-5 min-h-[calc(100vh-160px)]">

      {/* ── Left: Audio Upload ── */}
      <div className="col-span-3 flex flex-col gap-4">
        <PanelCard label="AUDIO_INPUT" icon={<Mic2 className="w-3.5 h-3.5" />}>
          <AudioUploader />
        </PanelCard>

        <PanelCard label="MORA_ANALYSIS" icon={<Target className="w-3.5 h-3.5" />}>
          {moraData ? (
            <div className="space-y-3">
              <MoraRow label="مقاطع" value={moraData.syllables ?? 0} max={20} color="amber" />
              <MoraRow label="إيقاع" value={moraData.rhythm ?? 0} max={100} color="violet" />
              <MoraRow label="قافية" value={moraData.rhymeScore ?? 0} max={100} color="emerald" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Target className="w-8 h-8 text-white/10" />
              <p className="text-[10px] text-white/20 text-center">اكتب بارك لرؤية التحليل</p>
            </div>
          )}
        </PanelCard>
      </div>

      {/* ── Center: Text Editor ── */}
      <div className="col-span-6 flex flex-col gap-4">
        
        {/* Editor Card */}
        <div className="relative bg-[#0D1017] border border-white/[0.06] rounded-2xl overflow-hidden flex-1 flex flex-col group hover:border-amber-500/15 transition-colors duration-500">
          
          {/* Top Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">BAR_EDITOR</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-mono text-white/15">{charCount} / ∞</span>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-white/5" />
                <div className="w-2 h-2 rounded-full bg-white/5" />
                <div className="w-2 h-2 rounded-full bg-white/5" />
              </div>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="اكتب بارك هنا... المساحة الإبداعية لك"
            dir="rtl"
            className="flex-1 w-full min-h-[240px] bg-transparent resize-none p-5 text-white/80 text-base leading-relaxed placeholder:text-white/[0.12] focus:outline-none font-arabic"
          />

          {/* Bottom Actions */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.04]">
            <div className="flex gap-2">
              <button
                onClick={handleSaveBar}
                disabled={!text.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider hover:bg-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Save className="w-3 h-3" />
                حفظ
              </button>
              <button
                onClick={() => { setText(''); setAiResponse(''); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/30 text-[10px] font-bold uppercase tracking-wider hover:bg-white/[0.08] hover:text-white/60 transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                مسح
              </button>
            </div>
            <p className="text-[9px] text-white/15 font-mono">CTRL+ENTER to analyze</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          {QUICK_ACTIONS.map(({ id, icon: Icon, label, desc }) => (
            <button
              key={id}
              onClick={() => handleAction(id)}
              disabled={!text.trim() || isLoading}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300 group overflow-hidden
                ${activeAction === id && !isLoading
                  ? 'bg-amber-500/10 border-amber-500/30 shadow-lg shadow-amber-500/10'
                  : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10'}
                disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${activeAction === id ? 'opacity-100' : ''}`}>
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent" />
              </div>
              {isLoading && activeAction === id
                ? <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                : <Icon className={`w-5 h-5 relative z-10 transition-colors ${activeAction === id ? 'text-amber-400' : 'text-white/25 group-hover:text-white/60'}`} />
              }
              <span className={`text-[10px] font-bold relative z-10 transition-colors ${activeAction === id ? 'text-amber-400' : 'text-white/25 group-hover:text-white/60'}`}>{label}</span>
              <span className="text-[8px] text-white/15 relative z-10 group-hover:text-white/30 transition-colors">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: AI Response ── */}
      <div className="col-span-3 flex flex-col gap-4">
        <PanelCard label="AI_RESPONSE" icon={<BrainCircuit className="w-3.5 h-3.5" />} accent="violet">
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-4"
              >
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
                  <div className="absolute inset-0 rounded-full border-t-2 border-violet-400 animate-spin" />
                  <BrainCircuit className="absolute inset-0 m-auto w-5 h-5 text-violet-400" />
                </div>
                <p className="text-[10px] text-violet-400/60 uppercase tracking-widest animate-pulse">جاري التحليل...</p>
              </motion.div>
            )}
            {!isLoading && aiResponse && (
              <motion.div key="response"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2 pb-2 border-b border-white/[0.04]">
                  <Sparkles className="w-3 h-3 text-violet-400" />
                  <span className="text-[9px] text-violet-400/70 uppercase tracking-widest font-bold">AI Analysis</span>
                </div>
                <p dir="rtl" className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{aiResponse}</p>
              </motion.div>
            )}
            {!isLoading && !aiResponse && (
              <motion.div key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 gap-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <BrainCircuit className="w-6 h-6 text-violet-400/40" />
                </div>
                <p className="text-[10px] text-white/15 text-center">اختر إجراءً من الأزرار أدناه لتحليل بارك</p>
              </motion.div>
            )}
          </AnimatePresence>
        </PanelCard>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function PanelCard({
  label, icon, children, accent = 'amber'
}: {
  label: string; icon: React.ReactNode; children: React.ReactNode; accent?: 'amber' | 'violet' | 'emerald';
}) {
  const accentColors = {
    amber:   'text-amber-400/60 border-amber-500/10',
    violet:  'text-violet-400/60 border-violet-500/10',
    emerald: 'text-emerald-400/60 border-emerald-500/10',
  };
  return (
    <div className="bg-[#0D1017] border border-white/[0.05] rounded-2xl overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04]`}>
        <span className={accentColors[accent]}>{icon}</span>
        <span className={`text-[9px] font-bold uppercase tracking-widest ${accentColors[accent]}`}>{label}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MoraRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const colorMap: Record<string, string> = {
    amber:   'from-amber-500 to-orange-500',
    violet:  'from-violet-500 to-purple-500',
    emerald: 'from-emerald-500 to-teal-500',
  };
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider">{label}</span>
        <span className="text-[9px] font-mono text-white/40">{value}</span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${colorMap[color]}`}
        />
      </div>
    </div>
  );
}
