import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import pLimit from 'p-limit';
import { useRepositoryStore, Bar } from '../store/repositoryStore';
import { geminiService } from '../services/geminiService';
import { moraEngine } from '../services/moraEngine';
import { accentScanner } from '../services/accentScanner';

const CHUNK_SIZE = 5;
const CONCURRENCY = 4;
const limit = pLimit(CONCURRENCY);

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shouldUseAI = (text: string) => {
  return text.length > 40 || text.split(' ').length > 6;
};

export const BatchImportModal: React.FC<BatchImportModalProps> = ({ isOpen, onClose }) => {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  
  const { addBatch, bars } = useRepositoryStore();

  const handleImport = async () => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setError('الرجاء إدخال بار واحد على الأقل');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setSuccessCount(0);

    try {
      const startSerial = bars.length + 1;
      const chunks = [];
      for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
        chunks.push(lines.slice(i, i + CHUNK_SIZE));
      }

      let processedCount = 0;
      await Promise.all(
        chunks.map((chunk, chunkIdx) =>
          limit(async () => {
            const aiTexts = chunk.filter(shouldUseAI);
            const aiResults = aiTexts.length
              ? await geminiService.analyzeBars(aiTexts, 'trap', 140, 'fusha')
              : [];

            const processedBars = chunk.map((text) => {
              const aiAnalysis = shouldUseAI(text) ? aiResults.shift() : {};

              return {
                text,
                dialect: 'fusha' as const,
                tags: ['batch_import'],
                ...aiAnalysis,
              };
            });

            addBatch(processedBars);
            processedCount += processedBars.length;
            setProgress(Math.round((processedCount / lines.length) * 100));
          })
        )
      );

      setSuccessCount(lines.length);
      setText('');
      setTimeout(() => {
        onClose();
        setSuccessCount(0);
        setProgress(0);
      }, 2000);
    } catch (err: any) {
      console.error("Batch import error:", err);
      setError(err.message || 'حدث خطأ أثناء المعالجة');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-bg-surface border border-border-default rounded-2xl p-6 w-full max-w-2xl shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Upload className="w-5 h-5 text-gold-400" />
                استيراد دفعة بارات
              </h3>
              <button 
                onClick={onClose}
                disabled={isProcessing}
                className="text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="البار الأول...&#10;البار الثاني...&#10;البار الثالث..."
                disabled={isProcessing || successCount > 0}
                className="w-full h-64 bg-bg-elevated border border-border-default rounded-xl p-4 text-text-primary placeholder:text-text-muted/50 focus:border-gold-400/50 outline-none resize-none custom-scrollbar"
                dir="auto"
              />

              {error && (
                <div className="flex items-center gap-2 text-quality-low bg-quality-low/10 p-3 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {successCount > 0 && (
                <div className="flex items-center gap-2 text-quality-high bg-quality-high/10 p-3 rounded-lg text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  تم استيراد {successCount} بار بنجاح!
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border-default">
                <div className="flex-1">
                  {isProcessing && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gold-400 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-gold-400">{progress}%</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 ml-4">
                  <button
                    onClick={onClose}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-lg text-text-muted hover:bg-bg-elevated transition-colors disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={isProcessing || !text.trim() || successCount > 0}
                    className="px-6 py-2 bg-gold-400 text-bg-base rounded-lg font-bold hover:bg-gold-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري المعالجة...
                      </>
                    ) : (
                      'بدء الاستيراد'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
