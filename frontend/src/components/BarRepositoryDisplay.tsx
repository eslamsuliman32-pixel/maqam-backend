import React, { useState, useMemo } from 'react';
import {
  Search, Filter, Plus, LayoutGrid, List, Star,
  Trash2, Tag, Hash, TrendingUp, Archive, Sparkles,
  ChevronDown, SortAsc, Download, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepositoryStore, Bar } from '../store/repositoryStore';

const QUALITY_CONFIG = {
  elite:   { label: 'ELITE',   color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20',   dot: 'bg-amber-400' },
  great:   { label: 'GREAT',   color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', dot: 'bg-emerald-400' },
  good:    { label: 'GOOD',    color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20',    dot: 'bg-blue-400' },
  average: { label: 'AVG',     color: 'text-white/30',    bg: 'bg-white/5',        border: 'border-white/10',       dot: 'bg-white/20' },
} as const;

type Quality = keyof typeof QUALITY_CONFIG;

function getQuality(rating: number): Quality {
  if (rating >= 90) return 'elite';
  if (rating >= 70) return 'great';
  if (rating >= 50) return 'good';
  return 'average';
}

interface Props {
  onBatchImport: () => void;
  onDeleteBar: (bar: Bar) => void;
}

export function BarRepositoryDisplay({ onBatchImport, onDeleteBar }: Props) {
  const { bars, toggleFavorite, updateRating } = useRepositoryStore();
  const [search,    setSearch]    = useState('');
  const [viewMode,  setViewMode]  = useState<'grid' | 'list'>('grid');
  const [sortBy,    setSortBy]    = useState<'date' | 'rating' | 'alpha'>('date');
  const [filterQ,   setFilterQ]   = useState<Quality | 'all'>('all');
  const [showFavs,  setShowFavs]  = useState(false);

  const filtered = useMemo(() => {
    let result = [...bars];
    if (search)      result = result.filter(b => b.text.includes(search));
    if (showFavs)    result = result.filter(b => b.isFavorite);
    if (filterQ !== 'all') result = result.filter(b => getQuality(b.rating ?? 0) === filterQ);
    if (sortBy === 'rating') result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (sortBy === 'alpha')  result.sort((a, b) => a.text.localeCompare(b.text, 'ar'));
    return result;
  }, [bars, search, showFavs, filterQ, sortBy]);

  const stats = useMemo(() => ({
    total:    bars.length,
    elite:    bars.filter(b => getQuality(b.rating ?? 0) === 'elite').length,
    favs:     bars.filter(b => b.isFavorite).length,
    avgScore: bars.length ? Math.round(bars.reduce((s, b) => s + (b.rating ?? 0), 0) / bars.length) : 0,
  }), [bars]);

  return (
    <div className="space-y-5">

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'TOTAL BARS',   value: stats.total,    icon: Archive,   color: 'amber' },
          { label: 'ELITE BARS',   value: stats.elite,    icon: Sparkles,  color: 'violet' },
          { label: 'FAVORITES',    value: stats.favs,     icon: Star,      color: 'rose' },
          { label: 'AVG SCORE',    value: stats.avgScore, icon: TrendingUp, color: 'emerald' },
        ].map(({ label, value, icon: Icon, color }) => (
          <StatCard key={label} label={label} value={value} icon={<Icon className="w-4 h-4" />} color={color} />
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 bg-[#0D1017] border border-white/[0.05] rounded-2xl p-3">
        
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث في الأسطر..."
            dir="rtl"
            className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white/70 placeholder:text-white/15 focus:outline-none focus:border-amber-500/30 focus:bg-amber-500/5 transition-all"
          />
        </div>

        {/* Filter Quality */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.05] rounded-xl p-1">
          {(['all', 'elite', 'great', 'good'] as const).map(q => (
            <button
              key={q}
              onClick={() => setFilterQ(q)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                filterQ === q ? 'bg-amber-500/90 text-black' : 'text-white/25 hover:text-white/50'
              }`}
            >
              {q === 'all' ? 'ALL' : QUALITY_CONFIG[q].label}
            </button>
          ))}
        </div>

        {/* Favs Toggle */}
        <button
          onClick={() => setShowFavs(p => !p)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${
            showFavs ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-white/[0.03] border-white/[0.06] text-white/25 hover:text-white/50'
          }`}
        >
          <Star className="w-3 h-3" />
          Favs
        </button>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="bg-white/[0.03] border border-white/[0.05] rounded-xl px-3 py-2.5 text-[10px] text-white/30 focus:outline-none focus:border-amber-500/20 appearance-none cursor-pointer"
        >
          <option value="date">DATE</option>
          <option value="rating">RATING</option>
          <option value="alpha">A–Z</option>
        </select>

        {/* View Mode */}
        <div className="flex bg-white/[0.03] border border-white/[0.05] rounded-xl overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-amber-500/20 text-amber-400' : 'text-white/20 hover:text-white/50'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-amber-500/20 text-amber-400' : 'text-white/20 hover:text-white/50'}`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Import */}
        <button
          onClick={onBatchImport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/90 text-black text-[10px] font-black uppercase tracking-wider hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
        >
          <Upload className="w-3 h-3" />
          استيراد
        </button>
      </div>

      {/* ── Grid / List ── */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div
          layout
          className={viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'flex flex-col gap-3'
          }
        >
          <AnimatePresence>
            {filtered.map((bar, i) => (
              <motion.div
                key={bar.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
              >
                {viewMode === 'grid'
                  ? <BarCard bar={bar} onDelete={onDeleteBar} onFav={toggleFavorite} />
                  : <BarRow  bar={bar} onDelete={onDeleteBar} onFav={toggleFavorite} />
                }
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

// ── BarCard ─────────────────────────────────────────────────────

function BarCard({ bar, onDelete, onFav }: { bar: Bar; onDelete: (b: Bar) => void; onFav: (id: string) => void }) {
  const q   = getQuality(bar.rating ?? 0);
  const cfg = QUALITY_CONFIG[q];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative bg-[#0D1017] border rounded-2xl p-5 overflow-hidden cursor-default transition-all duration-300 group
        ${hovered ? 'border-amber-500/20 shadow-xl shadow-amber-500/5' : 'border-white/[0.05]'}`}
    >
      {/* Glow */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-transparent pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Quality Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-bold ${cfg.bg} ${cfg.border} ${cfg.color}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onFav(bar.id)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
              bar.isFavorite ? 'bg-rose-500/15 text-rose-400' : 'bg-white/[0.04] text-white/15 hover:text-white/40'
            }`}
          >
            <Star className="w-3.5 h-3.5" fill={bar.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => onDelete(bar)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] text-white/10 hover:bg-red-500/15 hover:text-red-400 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Text */}
      <p dir="rtl" className="text-white/75 text-sm leading-relaxed line-clamp-3 mb-4">{bar.text}</p>

      {/* Tags */}
      {bar.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {bar.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.05] text-[9px] text-white/25 font-mono">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Score Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-[8px] text-white/15 uppercase tracking-wider">Score</span>
          <span className="text-[8px] font-mono text-white/25">{bar.rating ?? 0}</span>
        </div>
        <div className="h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-700"
            style={{ width: `${bar.rating ?? 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── BarRow (list view) ───────────────────────────────────────────

function BarRow({ bar, onDelete, onFav }: { bar: Bar; onDelete: (b: Bar) => void; onFav: (id: string) => void }) {
  const q   = getQuality(bar.rating ?? 0);
  const cfg = QUALITY_CONFIG[q];
  return (
    <div className="flex items-center gap-4 bg-[#0D1017] border border-white/[0.05] rounded-xl px-5 py-4 hover:border-amber-500/15 hover:bg-amber-500/[0.02] transition-all group">
      <div className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-bold ${cfg.bg} ${cfg.border} ${cfg.color}`}>
        <div className={`w-1 h-1 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </div>
      <p dir="rtl" className="flex-1 text-white/60 text-sm truncate group-hover:text-white/80 transition-colors">{bar.text}</p>
      <div className="shrink-0 flex items-center gap-2">
        <span className="text-[9px] font-mono text-white/20 w-8 text-right">{bar.rating ?? 0}</span>
        <button onClick={() => onFav(bar.id)} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${bar.isFavorite ? 'text-rose-400' : 'text-white/10 hover:text-white/30'}`}>
          <Star className="w-3.5 h-3.5" fill={bar.isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button onClick={() => onDelete(bar)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/10 hover:text-red-400 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, ...props }: { label: string; value: number; icon: React.ReactNode; color: string; [key: string]: any }) {
  const colorMap: Record<string, string> = {
    amber:   'from-amber-500/10 to-transparent border-amber-500/10 text-amber-400',
    violet:  'from-violet-500/10 to-transparent border-violet-500/10 text-violet-400',
    rose:    'from-rose-500/10 to-transparent border-rose-500/10 text-rose-400',
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/10 text-emerald-400',
  };
  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} bg-[#0D1017] border rounded-2xl p-5`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`${colorMap[color].split(' ')[4]}`}>{icon}</span>
        <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-4xl font-black text-white tabular-nums">{value}</div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
        <Archive className="w-7 h-7 text-white/10" />
      </div>
      <div className="text-center">
        <p className="text-white/30 font-bold text-sm">لا توجد أسطر</p>
        <p className="text-white/10 text-[11px] mt-1">أضف أسطرك من المحرر أو استورد ملفاً</p>
      </div>
    </div>
  );
}
