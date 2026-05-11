import React, { useState } from 'react';
import {
  Layout, Layers, Target, Hash, Zap, TrendingUp,
  BarChart2, Music2, Mic2, ChevronRight, Sparkles, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STRUCTURE_BLOCKS = [
  { id: 'intro',   label: 'INTRO',   bars: 4,  color: 'violet' },
  { id: 'verse1',  label: 'VERSE 1', bars: 16, color: 'amber' },
  { id: 'hook',    label: 'HOOK',    bars: 8,  color: 'emerald' },
  { id: 'verse2',  label: 'VERSE 2', bars: 16, color: 'amber' },
  { id: 'hook2',   label: 'HOOK',    bars: 8,  color: 'emerald' },
  { id: 'bridge',  label: 'BRIDGE',  bars: 8,  color: 'blue' },
  { id: 'outro',   label: 'OUTRO',   bars: 4,  color: 'violet' },
] as const;

const RHYME_SCHEMES = ['AABB', 'ABAB', 'AAAA', 'ABBA', 'ABCABC', 'Free'];
const BPM_PRESETS = [70, 80, 85, 90, 95, 100, 105, 110, 120, 140];

export function BeatBlueprintView() {
  const [bpm,        setBpm]    = useState(90);
  const [scheme,     setScheme] = useState('AABB');
  const [activeBlock, setBlock] = useState<string | null>(null);

  return (
    <div className="space-y-5">

      {/* ── Top Controls ── */}
      <div className="grid grid-cols-3 gap-4">
        
        {/* BPM Card */}
        <div className="bg-[#0D1017] border border-white/[0.05] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Music2 className="w-3.5 h-3.5 text-amber-400/60" />
            <span className="text-[9px] font-bold text-amber-400/60 uppercase tracking-widest">BPM_TEMPO</span>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-5xl font-black text-white tabular-nums">{bpm}</span>
            <span className="text-sm text-white/20 font-mono">BPM</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {BPM_PRESETS.map(b => (
              <button
                key={b}
                onClick={() => setBpm(b)}
                className={`py-1.5 rounded-lg text-[9px] font-bold transition-all ${
                  bpm === b ? 'bg-amber-500/90 text-black' : 'bg-white/[0.04] text-white/25 hover:bg-white/[0.08] hover:text-white/50'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Rhyme Scheme */}
        <div className="bg-[#0D1017] border border-white/[0.05] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Hash className="w-3.5 h-3.5 text-violet-400/60" />
            <span className="text-[9px] font-bold text-violet-400/60 uppercase tracking-widest">RHYME_SCHEME</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {RHYME_SCHEMES.map(s => (
              <button
                key={s}
                onClick={() => setScheme(s)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold font-mono transition-all ${
                  scheme === s
                    ? 'bg-violet-500/20 border border-violet-500/30 text-violet-300'
                    : 'bg-white/[0.03] border border-white/[0.05] text-white/25 hover:text-white/50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <RhymePreview scheme={scheme} />
        </div>

        {/* Stats */}
        <div className="bg-[#0D1017] border border-white/[0.05] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-3.5 h-3.5 text-emerald-400/60" />
            <span className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-widest">TRACK_STATS</span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Total Bars',  value: STRUCTURE_BLOCKS.reduce((s, b) => s + b.bars, 0), unit: 'bars' },
              { label: 'Duration',    value: Math.round(STRUCTURE_BLOCKS.reduce((s, b) => s + b.bars, 0) * (60 / bpm) * 4), unit: 'sec' },
              { label: 'Complexity',  value: 74, unit: '%' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[10px] text-white/25">{label}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-white tabular-nums">{value}</span>
                  <span className="text-[9px] text-white/20 font-mono">{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Song Structure ── */}
      <div className="bg-[#0D1017] border border-white/[0.05] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Layout className="w-3.5 h-3.5 text-amber-400/60" />
            <span className="text-[9px] font-bold text-amber-400/60 uppercase tracking-widest">SONG_STRUCTURE</span>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[9px] text-white/25 hover:text-white/50 transition-colors">
            <RefreshCw className="w-3 h-3" />
            Reset
          </button>
        </div>

        {/* Timeline */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {STRUCTURE_BLOCKS.map((block, i) => {
            const colorMap: Record<string, string> = {
              amber:   'bg-amber-500/20 border-amber-500/30 text-amber-400',
              violet:  'bg-violet-500/20 border-violet-500/30 text-violet-400',
              emerald: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
              blue:    'bg-blue-500/20 border-blue-500/30 text-blue-400',
            };
            const isActive = activeBlock === block.id;
            return (
              <motion.button
                key={block.id}
                whileHover={{ y: -2 }}
                onClick={() => setBlock(isActive ? null : block.id)}
                style={{ flexBasis: `${(block.bars / 64) * 100}%`, minWidth: 64 }}
                className={`relative border rounded-xl px-3 py-3 text-center transition-all duration-300 ${
                  isActive
                    ? colorMap[block.color] + ' shadow-lg'
                    : 'bg-white/[0.03] border-white/[0.06] text-white/25 hover:border-white/10 hover:text-white/40'
                }`}
              >
                <div className="text-[8px] font-black uppercase tracking-wider mb-1">{block.label}</div>
                <div className="text-[7px] font-mono opacity-60">{block.bars}B</div>
                {isActive && (
                  <motion.div layoutId="block-indicator" className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Waveform-style visualizer */}
        <div className="flex items-end gap-[2px] h-20 bg-white/[0.02] rounded-xl p-3 overflow-hidden">
          {Array.from({ length: 120 }).map((_, i) => {
            const h = 15 + Math.abs(Math.sin(i * 0.3 + i * 0.1) * 65 + Math.cos(i * 0.7) * 25);
            return (
              <motion.div
                key={i}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: i * 0.005, duration: 0.4 }}
                className="flex-1 rounded-full origin-bottom bg-gradient-to-t from-amber-500/60 to-amber-300/20"
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* ── Section Detail ── */}
      <AnimatePresence>
        {activeBlock && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-[#0D1017] border border-amber-500/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">
                {STRUCTURE_BLOCKS.find(b => b.id === activeBlock)?.label} — Details
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {['Rhyme Density', 'Flow Intensity', 'Syllable Count', 'Complexity'].map((metric, i) => (
                <div key={metric} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                  <p className="text-[9px] text-white/25 mb-2">{metric}</p>
                  <div className="text-2xl font-black text-white">{[78, 92, 16, 65][i]}</div>
                  <div className="mt-2 h-0.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${[78, 92, 80, 65][i]}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RhymePreview({ scheme }: { scheme: string }) {
  const lines = scheme === 'AABB'   ? ['كلمة — كلمة (A)', 'قافية — قافية (A)', 'جملة — جملة (B)', 'صوت — صوت (B)']
              : scheme === 'ABAB'   ? ['شعر — شعر (A)', 'حياة — حياة (B)', 'فكر — فكر (A)', 'هواء — هواء (B)']
              : scheme === 'ABBA'   ? ['ليل — ليل (A)', 'نور — نور (B)', 'نار — نار (B)', 'دور — دور (A)']
              : ['...', '...', '...', '...'];
  const colors: Record<string, string> = { A: 'text-violet-400', B: 'text-emerald-400', C: 'text-blue-400' };
  return (
    <div className="space-y-1">
      {lines.map((l, i) => {
        const letter = l.slice(-2, -1);
        return (
          <div key={i} className={`text-[10px] font-mono ${colors[letter] ?? 'text-white/25'}`}>{l}</div>
        );
      })}
    </div>
  );
}
