import React, { useState } from 'react';
import { 
  Settings, Cpu, Terminal, Activity, Layers, 
  Upload, Hash, CheckCircle2, Plus, 
  Zap, Database, Play, AudioWaveform, 
  Search, BrainCircuit, Target, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MAQAM v2.0 - Core Interface
 * تم تصميم هذا الملف ليعمل مباشرة وبأعلى أداء بصري
 */

const App = () => {
  const [activeTab, setActiveTab] = useState('studio');
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#080A0F] text-white font-sans selection:bg-amber-500/30 overflow-hidden">
      {/* Ambient Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-violet-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className={`bg-[#0D1017] border-r border-white/5 transition-all duration-300 flex flex-col z-50 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
          <div className="p-6 flex items-center gap-3 border-b border-white/5">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
              <Zap className="w-6 h-6 text-black fill-current" />
            </div>
            {isSidebarOpen && (
              <span className="text-xl font-black tracking-tighter font-mono italic">MAQAM <span className="text-amber-500 text-xs not-italic">v2.0</span></span>
            )}
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <NavItem icon={<Activity />} label="Studio" active={activeTab === 'studio'} onClick={() => setActiveTab('studio')} collapsed={!isSidebarOpen} />
            <NavItem icon={<Database />} label="Repository" active={activeTab === 'repo'} onClick={() => setActiveTab('repo')} collapsed={!isSidebarOpen} />
            <NavItem icon={<BrainCircuit />} label="AI Lab" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} collapsed={!isSidebarOpen} />
            <NavItem icon={<Settings />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} collapsed={!isSidebarOpen} />
          </nav>

          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-4 text-white/20 hover:text-white border-t border-white/5 flex justify-center transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <header className="flex justify-between items-start mb-12">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="text-4xl font-black font-arabic mb-2 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent italic">
                مختبر التحليل الصوتي
              </h1>
              <div className="flex items-center gap-3 font-mono text-[10px] text-white/30 uppercase tracking-[0.2em]">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> System: Online</span>
                <span className="opacity-50">|</span>
                <span>Buffer: 512ms</span>
              </div>
            </motion.div>
            
            <div className="flex gap-4">
              <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition-all font-mono text-xs group">
                <Terminal className="w-4 h-4 group-hover:text-amber-500 transition-colors" /> Console
              </button>
              <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-95">
                <Plus className="w-4 h-4" /> Project
              </button>
            </div>
          </header>

          <div className="grid grid-cols-12 gap-6">
            {/* Main Visualizer Area */}
            <motion.div 
              className="col-span-12 lg:col-span-8 space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="bg-[#0D1017] border border-white/5 rounded-3xl p-8 h-[450px] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.02] to-transparent" />
                <div className="relative z-10 flex flex-col items-center justify-center h-full">
                  <div className="w-32 h-32 mb-6 rounded-full border border-white/5 flex items-center justify-center relative group-hover:border-amber-500/30 transition-colors duration-500">
                    <AudioWaveform className="w-12 h-12 text-white/10 group-hover:text-amber-500 transition-all duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-500/20 animate-spin" />
                  </div>
                  <p className="font-mono text-xs tracking-[0.3em] text-white/20 uppercase">Waiting for sonic input...</p>
                </div>
                
                {/* Decorative Grid */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/[0.03] to-transparent opacity-50" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <StatCard icon={<Hash />} label="Flow Density" value="0.0" unit="n/s" color="text-amber-400" />
                <StatCard icon={<Zap />} label="Core Energy" value="0%" unit="db" color="text-violet-400" />
                <StatCard icon={<Target />} label="Sync Rate" value="0.0" unit="%" color="text-emerald-400" />
              </div>
            </motion.div>

            {/* Sidebar Stats */}
            <motion.div 
              className="col-span-12 lg:col-span-4 space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="bg-[#0D1017] border border-white/5 rounded-3xl p-6">
                <h3 className="text-[10px] font-bold font-mono text-white/30 mb-8 flex items-center gap-2 uppercase tracking-widest">
                  <Layers className="w-3 h-3" /> System_Stack
                </h3>
                <div className="space-y-6">
                  <LayerItem label="Lyrical Engine" status="complete" />
                  <LayerItem label="Sonic DNA" status="active" />
                  <LayerItem label="Mora Processor" status="pending" />
                  <LayerItem label="Neural Bridge" status="pending" />
                </div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                  <BrainCircuit size={40} />
                </div>
                <h3 className="text-amber-500 font-bold mb-3 flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" /> AI Insights
                </h3>
                <p className="text-xs text-white/50 leading-relaxed font-arabic">
                  النظام جاهز لاستقبال البيانات. ابدأ برفع ملف صوتي أو كتابة أسطر برمجية لتحليل البنية الإيقاعية.
                </p>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

// Components
const NavItem = ({ icon, label, active, onClick, collapsed }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all relative group ${
      active 
        ? 'bg-amber-500 text-black shadow-xl shadow-amber-500/10' 
        : 'text-white/30 hover:bg-white/5 hover:text-white'
    }`}
  >
    <div className="flex-shrink-0">{React.cloneElement(icon, { size: 18, strokeWidth: active ? 2.5 : 2 })}</div>
    {!collapsed && <span className="font-bold text-xs tracking-tight uppercase">{label}</span>}
    {active && <motion.div layoutId="nav-glow" className="absolute inset-0 bg-white/20 rounded-2xl blur-md -z-10" />}
  </button>
);

const StatCard = ({ icon, label, value, unit, color }: any) => (
  <div className="bg-[#0D1017] border border-white/5 p-5 rounded-2xl hover:border-white/10 transition-colors">
    <div className={`mb-3 ${color} opacity-80`}>{React.cloneElement(icon, { size: 14 })}</div>
    <div className="text-2xl font-black font-mono tracking-tighter mb-1">
      {value}<span className="text-[10px] text-white/20 ml-1 font-normal">{unit}</span>
    </div>
    <div className="text-[9px] uppercase tracking-widest text-white/30 font-bold">{label}</div>
  </div>
);

const LayerItem = ({ label, status }: { label: string, status: 'complete' | 'active' | 'pending' }) => (
  <div className="flex items-center justify-between group/item">
    <span className={`text-[10px] font-mono tracking-wide ${status === 'pending' ? 'text-white/20' : 'text-white/60 group-hover/item:text-white transition-colors'}`}>
      {label}
    </span>
    <div className="flex items-center gap-3">
      {status === 'complete' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
      {status === 'active' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />}
      {status === 'pending' && <div className="w-1.5 h-1.5 rounded-full bg-white/5" />}
    </div>
  </div>
);

export default App;
