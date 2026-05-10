import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { 
  Search, BookOpen, Cpu, Loader2, ChevronDown, Activity, 
  Edit3, Sparkles, BookOpen as BookOpenIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepositoryStore } from "../store/repositoryStore";
import { geminiService } from "../services/geminiService";
import { CHS, EXAMPLES } from '../constants/academyTechs';
import { ACADEMY_TOTAL_TECHNIQUES, APP_CODENAME } from "../constants";
import { Bar } from "../types";
// import { AnalyzeResult, ImproveResult } from './ResultViews';

const Card = ({ tech, ch, open, onToggle, badge, onApply }: any) => (
  <div className={`group bg-bg-surface/40 border ${open ? 'border-gold-400' : 'border-border-default'} hover:border-gold-400/30 rounded-2xl transition-all duration-500 overflow-hidden`}>
    <div className="p-5 flex items-center justify-between cursor-pointer" onClick={onToggle}>
      <div className="flex items-center gap-4 min-w-0">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-500 shadow-lg ${open ? 'scale-110' : 'group-hover:scale-110'}`} style={{ backgroundColor: ch.d, color: ch.c }}>
          {ch.icon}
        </div>
        <div className="text-right">
          <h4 className="text-sm font-bold text-text-primary group-hover:text-gold-400 transition-colors">{tech.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">{tech.en}</span>
            <span className="w-1 h-1 rounded-full bg-border-default" />
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-bg-base/50 text-text-muted">{tech.diff}</span>
          </div>
        </div>
      </div>
      <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-500 ${open ? 'rotate-180' : ''}`} />
    </div>
    
    <AnimatePresence>
      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="p-5 pt-0 space-y-4">
            <div className="p-4 bg-bg-base/40 rounded-xl border border-border-default/50">
              <p className="text-xs text-text-secondary leading-relaxed text-right">{tech.desc}</p>
            </div>
            {tech.ex && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block text-right">مثال تطبيق</span>
                <div className="p-3 bg-gold-400/5 border border-gold-400/10 rounded-xl font-mono text-xs text-gold-400/80 leading-relaxed text-right whitespace-pre-line">
                  {tech.ex}
                </div>
              </div>
            )}
            <button 
              onClick={() => onApply(tech)}
              className="w-full py-2.5 bg-gold-400 text-bg-base rounded-xl text-xs font-bold hover:bg-gold-300 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              تطبيق التقنية على المستودع
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export const RapAcademy2: React.FC<{ beatBlueprint?: any }> = ({ beatBlueprint }) => {
  const [chId, setChId] = useState("grammar");
  const [tab, setTab] = useState("library");
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [aiText, setAiText] = useState("");
  const [aiMode, setAiMode] = useState("analyze");
  const [aiResult, setAiResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Repository State
  const { bars, selectedBars, clearSelection, updateBar } = useRepositoryStore();

  // Generative Template Modal State
  const [activeTechForRepo, setActiveTechForRepo] = useState<any>(null);
  const [templateBarId, setTemplateBarId] = useState<string>("");
  const [templateResult, setTemplateResult] = useState<string>("");
  const [isTemplateGenerating, setIsTemplateGenerating] = useState(false);
  const [templateError, setTemplateError] = useState("");

  const handleApplyTemplate = async () => {
    if (!activeTechForRepo || !templateBarId) return;
    setIsTemplateGenerating(true);
    setTemplateResult("");
    setTemplateError("");
    
    const bar = bars.find(b => b.id === templateBarId);
    if (!bar) return;

    try {
      const prompt = `• ${activeTechForRepo.name} (${activeTechForRepo.en}): ${activeTechForRepo.desc}\nمثال: ${activeTechForRepo.ex}`;
      const response = await geminiService.improveRapAcademy(bar.text, prompt);
      if (response.improvements && response.improvements.length > 0) {
        setTemplateResult(response.improvements[0].rewrite);
      } else {
        setTemplateError("لم يتم العثور على تحسين.");
      }
    } catch(e: any) {
      const isQuota = e.message?.includes('Quota') || e.message?.includes('تجاوزت حصة');
      setTemplateError(isQuota ? e.message : `حدث خطأ: ${e.message}`);
    } finally {
      setIsTemplateGenerating(false);
    }
  };

  const handleSaveTemplateResult = () => {
    if (templateResult && templateBarId) {
      updateBar(templateBarId, { text: templateResult });
      setActiveTechForRepo(null);
      setTemplateResult("");
      setTemplateBarId("");
    }
  };

  const ch = CHS.find(c=>c.id===chId) || CHS[0];
  const isSearch = search.trim().length >= 2;
  
  const searchAll = useCallback((q: string) => {
    const lq = q.toLowerCase();
    return CHS.flatMap(ch => ch.techs.filter(t =>
      t.name.includes(q)||t.en.toLowerCase().includes(lq)||t.desc.includes(q)||(t.tags&&t.tags.some(tg=>tg.includes(q)))
    ).map(t=>({...t,_ch:ch})));
  }, []);

  const results = useMemo(()=>searchAll(search),[search, searchAll]);

  return (
    <div className="flex flex-col h-full bg-bg-primary/20 backdrop-blur-2xl border border-border-default rounded-3xl overflow-hidden shadow-2xl relative">
      <div className="absolute inset-0 bg-gradient-to-br from-gold-400/5 via-transparent to-purple-500/5 pointer-events-none" />
      
      {/* HEADER */}
      <div className="flex items-center justify-between p-6 border-b border-border-default bg-bg-surface/40 relative z-10">
        <div className="flex items-center gap-6">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-12 h-12 rounded-2xl bg-gold-400/10 border border-gold-400/30 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(212,160,23,0.15)]"
          >
            🎓
          </motion.div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-text-primary leading-none tracking-tight">أكاديمية الراب العربي 2</h2>
            <p className="text-[11px] text-text-muted mt-2 font-mono uppercase tracking-[0.2em]">
              <b className="text-gold-400">{ACADEMY_TOTAL_TECHNIQUES}</b> تقنية احترافية • <b className="text-gold-400 ml-1">{bars.filter(b => !b.deleted).length}</b> بار في المستودع • <span className="text-gold-400/60">{APP_CODENAME}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-gold-400 transition-colors" />
            <input 
              value={search} 
              onChange={e=>{setSearch(e.target.value);setOpenId(null);}}
              placeholder="ابحث عن تقنية..." 
              className="bg-bg-base/40 border border-border-default rounded-xl pl-4 pr-10 py-2.5 text-xs text-text-primary outline-none focus:border-gold-400/50 transition-all w-64 text-right backdrop-blur-md"
            />
            {search && (
              <button type="button" onClick={()=>setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">×</button>
            )}
          </div>
          
          <div className="flex bg-bg-base/40 border border-border-default rounded-xl p-1.5 gap-1 backdrop-blur-md">
            <button 
              type="button"
              onClick={()=>{setTab("library");setAiResult(null);}} 
              className={`text-[11px] font-bold px-5 py-2 rounded-lg transition-all flex items-center gap-2 ${tab==="library" ? 'bg-gold-400 text-bg-base shadow-[0_0_15px_rgba(212,160,23,0.3)]' : 'text-text-muted hover:text-text-primary'}`}
            >
              <BookOpenIcon className="w-4 h-4" /> المكتبة
            </button>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* SIDEBAR */}
        <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} border-l border-border-default bg-bg-surface/10 overflow-y-auto p-4 transition-all duration-500 relative group/sidebar`}>
          <button 
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-bg-surface border border-border-default rounded-full flex items-center justify-center text-text-muted hover:text-gold-400 transition-all opacity-0 group-hover/sidebar:opacity-100 z-20"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-500 ${isSidebarCollapsed ? 'rotate-90' : '-rotate-90'}`} />
          </button>

          <div className={`text-[10px] font-bold tracking-[0.3em] text-text-muted uppercase mb-6 px-2 transition-opacity duration-300 text-right ${isSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}>الفصول</div>
          <div className="space-y-2">
            {CHS.map(c => {
              const active = c.id === chId && !isSearch;
              return (
                <button 
                  type="button"
                  key={c.id} 
                  onClick={()=>{setChId(c.id);setOpenId(null);setSearch(""); setTab("library");}} 
                  className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 group ${active ? 'bg-gold-400/10 border border-gold-400/30' : 'hover:bg-bg-elevated/50 border border-transparent'}`}
                >
                  {!isSidebarCollapsed && (
                    <>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-bg-base/50 border border-border-default text-text-muted">{c.techs.length}</span>
                      <div className="flex-1 text-right min-w-0">
                        <div className={`text-xs font-bold truncate ${active ? 'text-gold-400' : 'text-text-secondary'}`}>{c.title}</div>
                        <div className="text-[9px] text-text-muted font-mono uppercase tracking-tighter mt-0.5">{c.sub}</div>
                      </div>
                    </>
                  )}
                  <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">{c.icon}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-bg-base/10 relative">
          
          <AnimatePresence>
            {activeTechForRepo && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-0 z-50 bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center p-6"
              >
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-bg-surface border border-border-default rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                >
                  <div className="p-6 border-b border-border-default flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gold-400/20 flex items-center justify-center text-gold-400">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-text-primary">تطبيق تقنية احترافية</h3>
                        <p className="text-[10px] text-text-muted mt-1">{activeTechForRepo.name}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => { setActiveTechForRepo(null); setTemplateResult(""); setTemplateError(""); setTemplateBarId(""); }} className="text-text-muted hover:text-text-primary">×</button>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    <div className="bg-gold-400/5 border border-gold-400/10 rounded-xl p-4">
                      <p className="text-xs text-text-secondary leading-relaxed"><span className="text-gold-400 font-bold ml-1">الوصف:</span>{activeTechForRepo.desc}</p>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-text-muted mb-2 block">1. اختر باراً من المستودع لتطبيق التقنية عليه</label>
                      <select 
                        className="w-full bg-bg-base/50 border border-border-default rounded-xl p-3 text-sm text-text-primary outline-none focus:border-gold-400/50 appearance-none text-right"
                        value={templateBarId}
                        onChange={(e) => { setTemplateBarId(e.target.value); setTemplateResult(""); }}
                      >
                        <option value="" disabled>البارات المتاحة في مستودعك...</option>
                        {bars.map(b => (
                          <option key={b.id} value={b.id}>{b.text}</option>
                        ))}
                      </select>
                    </div>

                    <button 
                      type="button"
                      onClick={handleApplyTemplate} 
                      disabled={isTemplateGenerating || !templateBarId}
                      className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isTemplateGenerating || !templateBarId ? 'bg-bg-elevated text-text-muted cursor-not-allowed' : 'bg-gold-400 text-bg-base hover:bg-gold-300'}`}
                    >
                      {isTemplateGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {isTemplateGenerating ? "جاري توليد البار بناءً على التقنية..." : "تطبيق التقنية وتوليد"}
                    </button>

                    {templateError && (
                      <div className="p-4 bg-quality-low/10 border border-quality-low/30 rounded-xl text-quality-low text-xs text-center">
                        {templateError}
                      </div>
                    )}

                    {templateResult && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <label className="text-[10px] font-bold text-text-muted block">2. النتيجة</label>
                        <textarea 
                          value={templateResult} 
                          onChange={(e) => setTemplateResult(e.target.value)} 
                          rows={4}
                          className="w-full bg-bg-base/50 border border-gold-400/50 rounded-xl p-4 text-sm text-text-primary outline-none focus:border-gold-400 transition-all resize-none text-right font-bold leading-relaxed shadow-[0_0_15px_rgba(212,160,23,0.1)]"
                        />
                        <div className="flex gap-3">
                          <button type="button" onClick={handleSaveTemplateResult} className="flex-1 py-3 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-400 transition-all">حفظ في المستودع</button>
                          <button type="button" onClick={() => setTemplateResult("")} className="px-6 py-3 bg-bg-base text-text-muted rounded-xl text-sm hover:text-text-primary transition-all">إلغاء</button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {tab === "library" && (
              <motion.div 
                key={isSearch ? "search" : chId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {!isSearch ? (
                  <div className="flex items-center gap-4 mb-8 p-6 rounded-2xl bg-bg-surface/30 border-l-4" style={{ borderColor: ch.c }}>
                    <div className="text-6xl font-black opacity-5 select-none" style={{ color: ch.c }}>{ch.n}</div>
                    <div className="flex-1 text-right">
                      <h3 className="text-xl font-bold" style={{ color: ch.c }}>الفصل {ch.n}: {ch.title}</h3>
                      <p className="text-sm text-text-muted mt-1">{ch.sub} — استكشف {ch.techs.length} تقنية احترافية</p>
                    </div>
                    <span className="text-4xl">{ch.icon}</span>
                  </div>
                ) : (
                  <div className="mb-8 text-right">
                    <h3 className="text-sm font-bold text-text-primary">نتائج البحث عن: <span className="text-gold-400">"{search}"</span></h3>
                    <p className="text-[10px] text-text-muted mt-1">تم العثور على {results.length} تقنية</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {isSearch && results.length === 0 ? (
                    <div className="col-span-full py-20 text-center">
                      <Search className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
                      <p className="text-text-muted">لا توجد نتائج تطابق بحثك...</p>
                    </div>
                  ) : (
                    (isSearch ? results : ch.techs).map((t: any) => (
                      <Card 
                        key={t.id} 
                        tech={t} 
                        ch={isSearch ? t._ch : ch} 
                        open={openId === t.id} 
                        onToggle={() => setOpenId(openId === t.id ? null : t.id)}
                        badge={isSearch}
                        onApply={(tech: any) => setActiveTechForRepo(tech)}
                      />
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
