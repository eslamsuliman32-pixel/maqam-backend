import React from 'react';
import { Activity, Sparkles } from 'lucide-react';

export function AnalyzeResult({r}: any) {
  const s = Math.max(0,Math.min(10,r.score||0));
  const sc = s>=8?"#10b981":s>=6?"#f59e0b":"#f87171";
  const sc2: Record<string, string> = {قوي:"#10b981",متوسط:"#f59e0b",خفيف:"#64748b"};
  
  return (
    <div className="space-y-8">
      <div className="flex gap-6 items-center p-6 bg-bg-elevated/30 rounded-2xl border border-border-default">
        <div className="w-20 h-20 shrink-0 rounded-2xl border-2 flex flex-col items-center justify-center bg-bg-base/50" style={{ borderColor: `${sc}44` }}>
          <span className="text-3xl font-black leading-none" style={{ color: sc }}>{s}</span>
          <span className="text-[10px] text-text-muted mt-1 font-mono">/ 10</span>
        </div>
        <div className="flex-1">
          <p className="text-sm text-text-primary leading-relaxed">{r.summary}</p>
          {r.flow_note && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-purple-400 font-medium">
              <Activity className="w-3.5 h-3.5" /> {r.flow_note}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold tracking-[0.3em] text-text-muted uppercase border-b border-border-default pb-3">
          التقنيات المكتشفة <span className="text-quality-perfect ml-2">{r.detected?.length||0}</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(r.detected||[]).map((d: any, i: number)=>{
            const c = sc2[d.strength]||"#64748b";
            return (
              <div key={i} className="p-4 rounded-xl border-r-4 bg-bg-surface/30 border border-border-default" style={{ borderRightColor: c }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold" style={{ color: c }}>{d.name}</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded border" style={{ background: `${c}18`, color: c, borderColor: `${c}28` }}>{d.strength}</span>
                </div>
                <p className="text-[9px] font-mono opacity-30 mb-2">{d.nameEn}</p>
                <p className="text-[11px] text-text-secondary italic leading-relaxed">"{d.evidence}"</p>
              </div>
            );
          })}
        </div>
      </div>

      {r.suggestions?.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold tracking-[0.3em] text-text-muted uppercase border-b border-border-default pb-3">اقتراحات التطوير</h4>
          <div className="grid grid-cols-1 gap-2">
            {(r.suggestions || []).map((s: string, i: number)=>(
              <div key={i} className="flex gap-3 p-4 bg-bg-surface/10 rounded-xl border border-border-default text-xs text-text-secondary leading-relaxed hover:bg-bg-surface/20 transition-all">
                <span className="text-gold-400 font-bold shrink-0">→</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ImproveResult({r}: any) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h4 className="text-[10px] font-bold tracking-[0.3em] text-text-muted uppercase">البار الأصلي</h4>
        <div className="p-5 bg-bg-elevated/30 border border-border-default rounded-2xl text-lg font-bold text-text-muted/60 italic">
          {r.original}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold tracking-[0.3em] text-text-muted uppercase border-b border-border-default pb-3">
          مقترحات التحسين <span className="text-gold-400 ml-2">{r.improvements?.length||0}</span>
        </h4>
        <div className="grid grid-cols-1 gap-4">
          {(r.improvements||[]).map((imp: any, i: number)=>(
            <div key={i} className="p-6 bg-bg-surface/30 border border-border-default rounded-2xl relative group hover:border-gold-400/30 transition-all">
              <div className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-bg-base border border-border-default flex items-center justify-center text-xs font-black text-gold-400/20 group-hover:text-gold-400 transition-colors">
                {i+1}
              </div>
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-4 h-4 text-gold-400" />
                <span className="text-sm font-bold text-gold-400">{imp.technique}</span>
              </div>
              <p className="text-xs text-text-muted mb-4 leading-relaxed">{imp.why}</p>
              <div className="p-4 bg-bg-base/50 border border-gold-400/10 rounded-xl text-lg font-bold text-quality-perfect leading-relaxed text-right">
                {imp.rewrite}
              </div>
            </div>
          ))}
        </div>
      </div>

      {r.pro_tip && (
        <div className="p-6 bg-gold-400/5 border border-gold-400/20 rounded-2xl flex gap-5">
          <div className="w-12 h-12 shrink-0 rounded-xl bg-gold-400/10 flex items-center justify-center text-2xl">⭐</div>
          <div>
            <h4 className="text-[10px] font-bold tracking-[0.3em] text-gold-400 uppercase mb-2">نصيحة الخبير</h4>
            <p className="text-xs text-text-secondary leading-relaxed">{r.pro_tip}</p>
          </div>
        </div>
      )}
    </div>
  );
}
