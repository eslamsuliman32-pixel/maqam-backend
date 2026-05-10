import React, { useMemo } from 'react';
import { Crosshair, Maximize, GitMerge, Activity, Layers, Cpu, Target, Zap, Info, ChevronRight, CheckCircle2, Save } from 'lucide-react';
import { motion } from 'framer-motion';

interface BeatBlueprintViewProps {
  blueprint: any;
  onSave?: () => void;
}

export const BeatBlueprintView: React.FC<BeatBlueprintViewProps> = ({ blueprint, onSave }) => {
  if (!blueprint) return null;

  const totalSteps = 16;
  const drumMap = blueprint?.transientMap || {
    kickPositions: [0, 8, 10],
    snarePositions: [4, 12],
    hatPattern: { positions: [0, 2, 4, 6, 8, 10, 12, 14] }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 font-mono selection:bg-[#00ff00]/30 text-white" dir="ltr">
      
      {/* FLOW ARCHITECT MASTER DASHBOARD */}
      <div className="bg-[#0a0a0a] border border-[#1f2937] rounded-xl p-8 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        {/* Blueprint Grid Background */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, #1f2937 1px, transparent 1px),
              linear-gradient(to bottom, #1f2937 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px'
          }}
        />

        <div className="relative z-10 flex flex-col gap-12">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#1f2937] pb-6 gap-6">
            <div className="space-y-2 text-left">
              <div className="text-[#00ff00] text-[10px] uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-[#00ff00] rounded-full animate-pulse" />
                System: Active // Version: 3.0 (Master Blueprint)
              </div>
              <h2 className="text-4xl font-bold text-white tracking-tight font-sans uppercase">
                Flow Architect <span className="text-[#00ffff]">v3.0</span>
              </h2>
              <h3 className="text-xl text-[#00ff00] font-bold font-sans" dir="rtl">
                المخطط الهندسي الموحد (Blueprint)
              </h3>
            </div>
            
            <div className="flex items-center gap-4">
              {onSave && (
                <button 
                  onClick={onSave}
                  className="flex items-center gap-2 px-4 py-2 bg-[#00ff00]/10 border border-[#00ff00]/30 text-[#00ff00] rounded-lg text-xs font-bold hover:bg-[#00ff00]/20 transition-all"
                >
                  <Save className="w-4 h-4" /> حفظ التقدم
                </button>
              )}
              <div className="flex gap-8 text-sm bg-[#111827] p-4 rounded-lg border border-[#1f2937]">
                <div className="flex flex-col items-end">
                  <span className="text-[#6b7280] text-[10px] uppercase tracking-widest">BPM Lock</span>
                  <span className="text-[#00ffff] font-bold text-2xl">{blueprint.temporalGrid?.bpm || blueprint.bpm || 90}</span>
                </div>
                <div className="w-px bg-[#1f2937]" />
                <div className="flex flex-col items-end">
                  <span className="text-[#6b7280] text-[10px] uppercase tracking-widest">Key</span>
                  <span className="text-[#ff00ff] font-bold text-2xl uppercase">{blueprint.spectralProfile?.key || blueprint.key || 'C'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Module 1: Rhythmic Coordinate Matrix v2.0 (Integrated & Multi-Property) */}
          <div className="space-y-4">
            <div className="flex justify-between items-center text-[10px] text-[#6b7280] uppercase tracking-widest">
              <span className="font-sans text-sm text-white font-bold flex items-center gap-2" dir="rtl">
                <Target className="w-4 h-4 text-[#00ffff]" /> مصفوفة الإحداثيات الإيقاعية v2.0 (متعددة الخواص)
              </span>
              <span>Precision: 1/16 Note • Multi-Layer Analysis</span>
            </div>

            <div className="bg-[#111827] border border-[#1f2937] rounded-lg p-6">
              <div className="grid grid-cols-8 md:grid-cols-16 gap-1.5">
                {Array.from({ length: totalSteps }).map((_, i) => {
                  const isKick = drumMap.kickPositions?.includes(i);
                  const isSnare = drumMap.snarePositions?.includes(i);
                  const isHihat = drumMap.hatPattern?.positions?.includes(i);
                  const energy = (isKick ? 0.8 : 0) + (isSnare ? 0.9 : 0) + (isHihat ? 0.3 : 0.1);
                  const beatNum = Math.floor(i / 4) + 1;
                  const subBeat = (i % 4) + 1;
                  
                  return (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="text-[7px] font-mono text-[#6b7280] text-center mb-1">
                        {beatNum}.{subBeat}
                      </div>
                      <div
                        className={`
                          relative h-16 rounded border flex flex-col items-center justify-center gap-1 transition-all duration-300
                          ${i % 4 === 0 ? 'bg-[#1f2937] border-[#00ff00]/40' : 'bg-[#0a0a0a] border-[#1f2937]'}
                        `}
                      >
                        {/* Energy Bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1f2937] overflow-hidden">
                          <div 
                            className="h-full bg-[#00ffff]/40" 
                            style={{ width: `${Math.min(100, energy * 100)}%` }} 
                          />
                        </div>

                        <div className="absolute top-1 flex gap-0.5">
                          {isKick && <div className="w-1.5 h-1.5 rounded-full bg-[#00ffff] shadow-[0_0_5px_#00ffff]" />}
                          {isSnare && <div className="w-1.5 h-1.5 rounded-full bg-[#ff00ff] shadow-[0_0_5px_#ff00ff]" />}
                        </div>
                        {isHihat && <div className="w-3 h-0.5 bg-[#6b7280]/60 rounded-full" />}
                        
                        {/* Intensity Indicator */}
                        <div className={`text-[6px] font-bold ${energy > 0.5 ? 'text-[#00ff00]' : 'text-[#6b7280]'}`}>
                          {energy > 0.8 ? 'PEAK' : energy > 0.4 ? 'MID' : 'LOW'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Module 2: Syllable Geometry */}
            <div className="space-y-4">
              <h3 className="font-sans text-sm text-white font-bold flex items-center gap-2" dir="rtl">
                <Maximize className="w-4 h-4 text-[#00ff00]" /> هندسة المقاطع (Syllable Geometry)
              </h3>
              <div className="bg-[#111827] border border-[#1f2937] rounded-lg p-6">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#9ca3af]">Target Density</span>
                    <span className="text-[#00ffff] font-bold">
                      {blueprint.styleFingerprint?.complexity ? Math.floor(blueprint.styleFingerprint.complexity * 16) : 12} Syllables
                    </span>
                  </div>
                  <div className="flex gap-1 h-6">
                    {[...Array(16)].map((_, i) => (
                      <div key={i} className={`flex-1 rounded-sm border ${i < 12 ? 'bg-[#00ff00]/20 border-[#00ff00]/40' : 'bg-[#1f2937] border-[#374151]'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Module 3: Rhyme Data Chain */}
            <div className="space-y-4">
              <h3 className="font-sans text-sm text-white font-bold flex items-center gap-2" dir="rtl">
                <GitMerge className="w-4 h-4 text-[#ff00ff]" /> سلسلة بيانات القوافي (Rhyme Data Chain)
              </h3>
              <div className="bg-[#111827] border border-[#1f2937] rounded-lg p-6">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#9ca3af]">Phoneme Anchors</span>
                    <span className="text-[#00ff00] font-bold font-sans" dir="rtl">
                      {blueprint.styleFingerprint?.arabicStyleMarkers?.join(' - ') || 'ب - ق - د'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {['A', 'A', 'B', 'B'].map((r, i) => (
                      <div key={i} className={`flex-1 h-8 rounded flex items-center justify-center font-bold border ${r === 'A' ? 'bg-[#00ffff]/10 border-[#00ffff]' : 'bg-[#ff00ff]/10 border-[#ff00ff]'}`}>
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Module 4: Technical Layer Indicator (Integrated & Detailed) */}
            <div className="space-y-4">
              <h3 className="font-sans text-sm text-white font-bold flex items-center gap-2" dir="rtl">
                <Layers className="w-4 h-4 text-[#ffff00]" /> مؤشر الطبقات التقني (Technical Layers)
              </h3>
              <div className="bg-[#111827] border border-[#1f2937] rounded-lg p-6 space-y-4">
                {[
                  { label: 'تحليل البصمة (Sonic DNA)', val: '100%' },
                  { label: 'رسم الشبكة (Grid Mapping)', val: '100%' },
                  { label: 'التوافق الصوتي (Phonetic)', val: '94%' },
                  { label: 'مزامنة الجيب (Pocket Sync)', val: 'Active' },
                  { label: 'ضغط التدفق (Flow Pressure)', val: 'Stable' },
                  { label: 'المزامنة الطيفية (Spectral)', val: 'Ready' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <span className="text-[#9ca3af]">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#00ff00] font-bold">{item.val}</span>
                      <CheckCircle2 className="w-3 h-3 text-[#00ff00]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Module 5: Protocol Summary */}
          {blueprint.dynamicMap?.sections && (
            <div className="space-y-4">
              <h3 className="font-sans text-sm text-white font-bold flex items-center gap-2" dir="rtl">
                <Activity className="w-4 h-4 text-[#00ffff]" /> مخطط المسار (Protocol Architecture)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {blueprint.dynamicMap.sections.map((section: any, idx: number) => (
                  <div key={idx} className="bg-[#111827] border border-[#1f2937] rounded-lg p-4 text-center">
                    <div className="text-[10px] text-[#6b7280] uppercase mb-1">{section.name || section.type}</div>
                    <div className="text-lg font-bold text-white">{section.bars || 8} BARS</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
