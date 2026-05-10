import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Trash2, Cpu, Loader2, Upload, 
  Activity, RefreshCw, LayoutGrid, List, Send, Hash, Star, CloudDownload
} from 'lucide-react';
import { useRepositoryStore } from '../store/repositoryStore';
import { Bar } from '../types';
import { moraEngine } from '../services/moraEngine';
import { accentScanner } from '../services/accentScanner';

const BarTableRow = React.memo(({ 
  bar, 
  isSelected, 
  onToggleSelection, 
  onFindSimilar, 
  onToggleFavorite, 
  onDeleteRequest 
}: { 
  bar: Bar, 
  isSelected: boolean, 
  onToggleSelection: (id: string) => void, 
  onFindSimilar: (id: string) => void, 
  onToggleFavorite: (id: string) => void, 
  onDeleteRequest: (bar: Bar) => void 
}) => (
  <tr className={`hover:bg-gold-400/5 transition-colors group ${isSelected ? 'bg-gold-400/5' : ''}`}>
    <td className="px-3 py-2.5">
      <input 
        type="checkbox" 
        checked={isSelected}
        onChange={() => onToggleSelection(bar.id)}
        className="accent-gold-400"
      />
    </td>
    <td className="px-3 py-2.5">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-text-primary font-medium">{bar.text}</span>
        <div className="flex items-center gap-2 text-[10px] font-mono whitespace-nowrap">
          <span className="bg-gold-400/10 text-gold-400 px-2 py-0.5 rounded border border-gold-400/30 font-bold">
            {bar.serialNumber}
          </span>
          <span className="bg-bg-elevated text-text-muted px-2 py-0.5 rounded border border-border-default">
            Mora: {bar.totalMorae || 0}
          </span>
          <div className="flex gap-0.5 items-end h-3 px-2 bg-bg-elevated rounded border border-border-default" dir="ltr">
            {accentScanner.scan(bar.text).map((bit, i) => (
              <div 
                key={i} 
                className={`w-1 rounded-t-[0.5px] transition-all duration-300 ${bit === '[!]' ? 'h-full bg-gold-400' : 'h-1/3 bg-text-muted/30'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </td>
    <td className="px-3 py-2.5">
      <span className="px-2 py-0.5 bg-gold-400/10 text-gold-400 rounded text-[10px] font-bold">{moraEngine.extractCorePhoneme(bar.text) || bar.corePhoneme}</span>
    </td>
    <td className="px-3 py-2.5">
      <span className="text-[10px] font-mono text-text-secondary">{bar.emotion || 'غير مصنف'}</span>
    </td>
    <td className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5" title="الوزن الصوتي">
          <ScanLine className="w-3.5 h-3.5 text-quality-high" />
          <span className="text-[10px] font-mono text-quality-high font-bold">{bar.sonicWeight || 0}</span>
        </div>
        <div className="w-px h-4 bg-border-default" />
        <div className="flex items-center gap-1.5" title="الوزن الإيقاعي">
          <Activity className="w-3.5 h-3.5 text-quality-medium" />
          <span className="text-[10px] font-mono text-quality-medium font-bold">{bar.rhythmicWeight || 0}</span>
        </div>
      </div>
    </td>
    <td className="px-3 py-2.5 text-[10px] font-mono text-text-muted">
      <div className="flex flex-col gap-1">
        <span className="text-gold-400 font-bold uppercase">{bar.flowMode?.replace('_', ' ')}</span>
        <span className="opacity-60">{moraEngine.getPhoneticTrait(bar.text)}</span>
      </div>
    </td>
    <td className="px-3 py-2.5 sticky left-0 bg-bg-surface/90 backdrop-blur-md z-10 shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.2)] border-l border-border-default/50">
      <div className="flex items-center justify-center gap-2">
        <button 
          onClick={() => {
            onToggleSelection(bar.id);
            // Assuming the parent component listens to selection changes and handles the transition,
            // or we could dispatch a custom event.
            // But just selecting it and firing setActiveTab('academy') might be enough if we pass it down.
            // Since we can't easily setActiveTab here without prop drilling, let's just dispatch an event!
            const event = new CustomEvent('export-to-workshop', { detail: { bar } });
            window.dispatchEvent(event);
          }}
          className="p-1 px-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all border border-indigo-500/20 text-[9px] font-bold flex items-center gap-1"
          title="تصدير لورشة البروتوكول"
        >
          <Send className="w-3 h-3" />
          <span>للورشة</span>
        </button>
        <button 
          onClick={() => onFindSimilar(bar.id)}
          className="p-1 px-2 rounded-lg bg-gold-400/10 text-gold-400 hover:bg-gold-400/20 transition-all border border-gold-400/20 text-[9px] font-bold flex items-center gap-1"
          title="البحث عن مشابه"
        >
          <Search className="w-3 h-3" />
          <span>مشابة</span>
        </button>
        <button 
          onClick={() => onToggleFavorite(bar.id)}
          className={`p-1 rounded hover:bg-gold-400/10 transition-colors ${bar.isFavorite ? 'text-gold-400' : 'text-text-muted'}`}
          title="تفضيل"
        >
          <Star className="w-3.5 h-3.5" fill={bar.isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button 
          onClick={() => onDeleteRequest(bar)}
          className="p-1 rounded hover:bg-bg-surface text-text-muted hover:text-quality-low transition-colors"
          title="حذف"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </td>
  </tr>
), (prevProps, nextProps) => {
  return prevProps.bar === nextProps.bar && prevProps.isSelected === nextProps.isSelected;
});

interface BarRepositoryDisplayProps {
  bars: Bar[];
  selectedBars: string[];
  viewMode: 'grid' | 'table';
  setViewMode: (mode: 'grid' | 'table') => void;
  groupMode: 'none' | 'ai' | 'rhyme' | 'family';
  setGroupMode: (mode: 'none' | 'ai' | 'rhyme' | 'family') => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  emotionFilter: string;
  setEmotionFilter: (filter: string) => void;
  footFilter: string;
  setFootFilter: (filter: string) => void;
  rhymeFilter: string;
  setRhymeFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isCategorizing: boolean;
  handleSmartCategorize: () => void;
  isUpdatingEmotions: boolean;
  handleUpdateEmotions: () => void;
  isRefreshingRepo: boolean;
  handleRefreshRepository: () => void;
  setIsBatchImportOpen: (open: boolean) => void;
  stressFilter: string;
  handleStressFilterChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFindSimilar: (id: string) => void;
  handleDeleteRequest: (bar: Bar) => void;
  setActiveTab: (tab: string) => void;
  toggleFavorite: (id: string) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
}

export const BarRepositoryDisplay: React.FC<BarRepositoryDisplayProps> = ({
  bars, selectedBars, viewMode, setViewMode, groupMode, setGroupMode,
  sortBy, setSortBy, emotionFilter, setEmotionFilter, footFilter, setFootFilter,
  rhymeFilter, setRhymeFilter, searchQuery, setSearchQuery,
  isCategorizing, handleSmartCategorize, isUpdatingEmotions, handleUpdateEmotions,
  isRefreshingRepo, handleRefreshRepository, setIsBatchImportOpen,
  stressFilter, handleStressFilterChange, handleFindSimilar, handleDeleteRequest,
  setActiveTab, toggleFavorite, toggleSelection, clearSelection
}) => {

  // Duplicate the filtering/sorting from App.tsx internally for now,
  // or use the exact same filtered bars passed from parent. To keep it clean, 
  // we do the filtering and grouping here to decouple further later.
  
  const filteredBars = useMemo(() => {
    return bars.filter(bar => {
      if (bar.deleted) return false;
      if (!bar.text) return false;
      
      let matchesSearch = true;
      if (searchQuery) {
        const tokens = searchQuery.toLowerCase().split(/\s+/);
        matchesSearch = tokens.every(token => {
          if (token.startsWith('phoneme:')) {
             return (bar.corePhoneme || moraEngine.extractCorePhoneme(bar.text) || '').includes(token.split(':')[1]);
          }
          if (token.startsWith('stress:')) {
             return accentScanner.scan(bar.text).join('').includes(token.split(':')[1]);
          }
          if (token.startsWith('weight:')) {
             const w = parseInt(token.split(':')[1]);
             return Math.abs((bar.rhythmicWeight || 0) - w) <= 15;
          }
          return bar.text.includes(token) || moraEngine.getPhoneticTrait(bar.text).includes(token);
        });
      }
      
      if (!matchesSearch) return false;
      
      // Emotion Filter
      if (emotionFilter !== 'all' && bar.emotion !== emotionFilter) return false;
      
      // Foot Filter
      if (footFilter !== 'all') {
        const hasFoot = bar.metricGrid?.some(col => col.footType === footFilter);
        if (!hasFoot) return false;
      }

      // Rhyme Filter
      if (rhymeFilter) {
        const corePhoneme = moraEngine.extractCorePhoneme(bar.text);
        if (!corePhoneme?.includes(rhymeFilter)) return false;
      }
      
      // Stress Filter (Exact match or substring)
      if (stressFilter) {
        const stressString = accentScanner.scan(bar.text).join('');
        if (!stressString.includes(stressFilter)) return false;
      }
      
      return true;
    });
  }, [bars, searchQuery, emotionFilter, footFilter, rhymeFilter, stressFilter]);

  const sortedBars = useMemo(() => {
    return [...filteredBars].sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'oldest': return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'moraCount': return (b.totalMorae || 0) - (a.totalMorae || 0);
        case 'sonicWeight': return (b.sonicWeight || 0) - (a.sonicWeight || 0);
        case 'serialNumber': return (a.serialNumber || '').localeCompare(b.serialNumber || '');
        default: return 0;
      }
    });
  }, [filteredBars, sortBy]);

  const groupedBars = useMemo(() => {
    if (groupMode === 'none') return { 'جميع البارات': sortedBars };

    return sortedBars.reduce((groups, bar) => {
      let key = 'أخرى';
      
      if (groupMode === 'rhyme') {
        key = moraEngine.extractCorePhoneme(bar.text) || 'بدون قافية';
      } else if (groupMode === 'family') {
        key = bar.emotion || 'غير مصنف';
      } else if (groupMode === 'ai') {
        // AI Category grouping if we had categories
        key = bar.category || bar.emotion || 'عام';
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(bar);
      return groups;
    }, {} as Record<string, Bar[]>);
  }, [sortedBars, groupMode]);

  return (
    <div className="w-full h-full flex flex-col gap-6 max-w-[1440px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-bg-surface/30 p-6 rounded-3xl border border-border-default backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gold-400/5 to-transparent pointer-events-none" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gold-400/10 border border-gold-400/30 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(212,160,23,0.1)]">
            📦
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary tracking-tight">مستودع البارات</h2>
            <p className="text-xs text-text-muted mt-1 font-mono uppercase tracking-widest">إجمالي البارات المتاحة: <b className="text-gold-400">{bars.filter(b => !b.deleted && b.text).length}</b></p>
          </div>
          {selectedBars.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 px-4 py-2 bg-gold-400/10 border border-gold-400/30 rounded-xl"
              style={{ marginRight: '-30px' }}
            >
              <span className="text-xs font-bold text-gold-400">{selectedBars.length} بار مختار</span>
              <button 
                onClick={() => setActiveTab('academy')}
                className="px-3 py-1 bg-gold-400 text-bg-base rounded-lg text-[10px] font-bold hover:bg-gold-300 transition-all flex items-center gap-1"
              >
                <Send className="w-3 h-3" /> للورشة
              </button>
              <button 
                onClick={() => setActiveTab('linguistic_lab')}
                className="px-3 py-1 bg-sky-500 text-bg-base rounded-lg text-[10px] font-bold hover:bg-sky-400 transition-all flex items-center gap-1"
              >
                <Send className="w-3 h-3" /> للمختبر
              </button>
              <button 
                onClick={handleSmartCategorize}
                disabled={isCategorizing}
                className="px-3 py-1 bg-bg-surface border border-gold-400/30 text-gold-400 rounded-lg text-[10px] font-bold hover:bg-gold-400/10 transition-all flex items-center gap-1"
              >
                {isCategorizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cpu className="w-3 h-3" />}
                تصنيف ذكي
              </button>
              <button 
                onClick={clearSelection}
                className="text-text-muted hover:text-quality-low transition-colors"
                title="مسح التحديد"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 relative z-10 w-full lg:w-auto">
          <div className="flex items-center gap-2">
              <button 
              onClick={handleUpdateEmotions}
              disabled={isUpdatingEmotions}
              className="px-4 py-2 bg-quality-high/10 text-quality-high border border-quality-high/30 rounded-xl hover:bg-quality-high/20 transition-all flex items-center gap-2 text-[10px] font-bold"
            >
              {isUpdatingEmotions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
              تحديث المشاعر
            </button>
            <button 
              onClick={() => setIsBatchImportOpen(true)}
              className="px-4 py-2 bg-gold-400/10 text-gold-400 border border-gold-400/30 rounded-xl hover:bg-gold-400/20 transition-all flex items-center gap-2 text-[10px] font-bold"
            >
              <Upload className="w-3.5 h-3.5" />
              استيراد
            </button>
            <button 
              onClick={handleRefreshRepository}
              disabled={isRefreshingRepo}
              className="px-4 py-2 bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded-xl hover:bg-sky-500/20 transition-all flex items-center gap-2 text-[10px] font-bold"
            >
              <CloudDownload className={`w-3.5 h-3.5 ${isRefreshingRepo ? 'animate-bounce' : ''}`} />
              استرجاع من السحابة
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted group-focus-within:text-gold-400 transition-colors" />
              <input 
                type="text" 
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className="bg-bg-base/40 border border-border-default rounded-xl pl-3 pr-9 py-2 text-[10px] focus:border-gold-400/50 outline-none transition-all w-32 md:w-40 backdrop-blur-md"
              />
            </div>

            <div className="relative group">
              <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted group-focus-within:text-gold-400 transition-colors" />
              <input 
                type="text" 
                placeholder="النبر..."
                value={stressFilter}
                onChange={handleStressFilterChange}
                className="bg-bg-base/40 border border-border-default rounded-xl pl-3 pr-9 py-2 text-[10px] focus:border-gold-400/50 outline-none transition-all w-24 md:w-32 backdrop-blur-md font-mono tracking-widest"
                dir="ltr"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Header: Filters & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-2 px-1 border-b border-white/5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-bg-surface/40 border border-border-default rounded-xl px-3 py-1.5 backdrop-blur-sm">
            <span className="text-[9px] text-text-muted font-mono uppercase">فرز:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none p-0 text-[10px] text-gold-400 focus:ring-0 outline-none transition-all cursor-pointer font-bold"
            >
              <option value="newest">الأحدث</option>
              <option value="oldest">الأقدم</option>
              <option value="serialNumber">الرقم</option>
              <option value="moraCount">المورا</option>
              <option value="sonicWeight">الوزن</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-bg-surface/40 border border-border-default rounded-xl px-3 py-1.5 backdrop-blur-sm">
            <span className="text-[9px] text-text-muted font-mono uppercase">مشاعر:</span>
            <select
              value={emotionFilter}
              onChange={(e) => setEmotionFilter(e.target.value)}
              className="bg-transparent border-none p-0 text-[10px] text-text-primary focus:ring-0 outline-none transition-all cursor-pointer font-bold"
            >
              <option value="all">الكل</option>
              <option value="حكيم">حكيم</option>
              <option value="عنيف">عنيف</option>
              <option value="حزين">حزين</option>
              <option value="غاضب">غاضب</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-bg-surface/40 border border-border-default rounded-xl px-3 py-1.5 backdrop-blur-sm">
            <span className="text-[9px] text-text-muted font-mono uppercase">تجميع:</span>
            <select
              value={groupMode}
              onChange={(e) => setGroupMode(e.target.value as any)}
              className="bg-transparent border-none p-0 text-[10px] text-gold-400 font-bold focus:ring-0 outline-none transition-all cursor-pointer"
            >
              <option value="none">بدون</option>
              <option value="ai">AI</option>
              <option value="rhyme">القافية</option>
              <option value="family">العائلة</option>
            </select>
          </div>

          <div className="relative group">
            <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gold-400/50 group-focus-within:text-gold-400 transition-colors" />
            <input 
              type="text" 
              placeholder="فلتر القافية"
              value={rhymeFilter}
              onChange={(e) => setRhymeFilter(e.target.value)}
              className="bg-bg-surface/40 border border-border-default rounded-xl pl-3 pr-7 py-1.5 text-[9px] focus:border-gold-400/50 outline-none transition-all w-24 backdrop-blur-sm font-arabic text-right"
              dir="rtl"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleSmartCategorize}
            disabled={isCategorizing || bars.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-gold-400/10 border border-gold-400/30 rounded-xl text-gold-400 text-[10px] font-bold hover:bg-gold-400/20 transition-all disabled:opacity-50"
          >
            {isCategorizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
            تصنيف ذكي
          </button>

          <div className="flex bg-bg-surface/80 border border-gold-400/20 rounded-xl p-1 gap-1 shadow-2xl">
            <button 
              onClick={() => setViewMode('grid')}
              className={`px-4 py-1.5 rounded-lg flex items-center gap-2 text-[10px] font-bold transition-all ${viewMode === 'grid' ? 'bg-gold-400 text-bg-base shadow-[0_0_15px_rgba(212,160,23,0.3)]' : 'text-text-muted hover:text-text-primary'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              الشبكة
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`px-4 py-1.5 rounded-lg flex items-center gap-2 text-[10px] font-bold transition-all ${viewMode === 'table' ? 'bg-gold-400 text-bg-base shadow-[0_0_15px_rgba(212,160,23,0.3)]' : 'text-text-muted hover:text-text-primary'}`}
            >
              <List className="w-3.5 h-3.5" />
              الجدول
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2">
        <div className="space-y-8">
          {Object.entries(groupedBars).map(([groupName, groupBars]) => {
            const barsInGroup = groupBars as Bar[];
            return (
              <div key={groupName} className="space-y-4 w-full">
                {groupMode !== 'none' && (
                  <h3 className="text-sm font-mono text-gold-400 flex items-center gap-2 uppercase tracking-widest px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-400" />
                    {groupName} ({barsInGroup.length})
                  </h3>
                )}
                
                {viewMode === 'table' ? (
                  <div className="bg-bg-surface border border-border-default rounded-xl shadow-xl">
                    <div className="overflow-x-auto rounded-xl">
                      <table className="w-full text-right border-collapse min-w-[850px]">
                        <thead>
                          <tr className="bg-bg-elevated/50 border-b border-border-default text-[10px] font-mono text-text-muted uppercase">
                            <th className="px-3 py-2.5 font-medium w-10">
                              <input 
                                type="checkbox" 
                                checked={selectedBars.length === barsInGroup.length && barsInGroup.length > 0}
                                onChange={() => {
                                  if (selectedBars.length === barsInGroup.length) {
                                    clearSelection();
                                  } else {
                                    useRepositoryStore.getState().setSelection(barsInGroup.map(b => b.id));
                                  }
                                }}
                                className="accent-gold-400"
                              />
                            </th>
                            <th className="px-3 py-2.5 font-medium text-right">البار (النص والمعلومات)</th>
                            <th className="px-3 py-2.5 font-medium text-right">القافية</th>
                            <th className="px-3 py-2.5 font-medium text-right">العاطفة</th>
                            <th className="px-3 py-2.5 font-medium text-right">الأوزان</th>
                            <th className="px-3 py-2.5 font-medium text-right">الفلو</th>
                            <th className="px-3 py-2.5 font-semibold text-center sticky left-0 bg-bg-elevated/95 backdrop-blur-md z-10 border-l border-border-default shadow-[-2px_0_5px_rgba(0,0,0,0.1)]">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-default/50">
                          {barsInGroup.map(bar => (
                            <BarTableRow 
                              key={bar.id} 
                              bar={bar} 
                              isSelected={selectedBars.includes(bar.id)} 
                              onToggleSelection={toggleSelection} 
                              onFindSimilar={handleFindSimilar} 
                              onToggleFavorite={toggleFavorite} 
                              onDeleteRequest={handleDeleteRequest} 
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    <AnimatePresence>
                      {barsInGroup.map(bar => (
                        <motion.div 
                          key={bar.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`bg-bg-elevated/40 border ${selectedBars.includes(bar.id) ? 'border-gold-400' : 'border-border-default'} hover:border-gold-400/30 rounded-2xl p-5 transition-all group relative overflow-hidden`}
                        >
                          <div className="flex justify-between items-start mb-4">
                             <div className="flex gap-2">
                               <input 
                                 type="checkbox" 
                                 checked={selectedBars.includes(bar.id)}
                                 onChange={() => toggleSelection(bar.id)}
                                 className="accent-gold-400"
                               />
                               <span className="text-[10px] font-mono text-gold-400 bg-gold-400/10 px-2 py-0.5 rounded border border-gold-400/20">{bar.serialNumber}</span>
                             </div>
                             <button onClick={() => toggleFavorite(bar.id)} className={`${bar.isFavorite ? 'text-gold-400' : 'text-text-muted hover:text-gold-400'} transition-colors`}>
                               <Star className="w-4 h-4" fill={bar.isFavorite ? 'currentColor' : 'none'} />
                             </button>
                          </div>
                          <p className="text-sm font-bold text-text-primary leading-relaxed mb-6 text-right">{bar.text}</p>
                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-border-default/50">
                             <div className="flex gap-3">
                                <div className="flex items-center gap-1 text-[10px] text-quality-high">
                                  <ScanLine className="w-3 h-3" /> {bar.sonicWeight || 0}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-quality-medium">
                                  <Activity className="w-3 h-3" /> {bar.rhythmicWeight || 0}
                                </div>
                             </div>
                             <div className="flex gap-2 items-center">
                                <button onClick={() => handleFindSimilar(bar.id)} className="p-1 px-2 rounded-lg bg-gold-400/10 text-gold-400 hover:bg-gold-400/20 transition-all border border-gold-400/20 text-[9px] font-bold">مشابه</button>
                                <button 
                                  onClick={() => handleDeleteRequest(bar)}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-quality-low/10 text-text-muted hover:text-quality-low transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                             </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            );
          })}

          {sortedBars.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 bg-bg-surface border border-border-default border-dashed rounded-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-text-muted" />
              </div>
              <h3 className="text-text-primary font-bold mb-2">لا توجد نتائج</h3>
              <p className="text-sm text-text-muted">جرب تغيير معايير البحث أو الفرز.</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

// Extracted mock missing icon if any 
const ScanLine = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>
);
