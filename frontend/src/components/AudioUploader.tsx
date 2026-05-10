import React, { useState, useCallback } from 'react';
import { Upload, Link as LinkIcon, Zap, Cpu, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audioAnalysisEngine, AudioMetadata } from '../services/audioAnalysisEngine';

interface AudioUploaderProps {
  onUploadComplete: (analysis: any) => void;
}

type Status = 'IDLE' | 'UPLOADING' | 'PROCESSING' | 'AI_ANALYZING' | 'COMPLETE' | 'ERROR';

export const AudioUploader: React.FC<AudioUploaderProps> = ({ onUploadComplete }) => {
  const [status, setStatus] = useState<Status>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [linkValue, setLinkValue] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleLinkAnalysis = async () => {
    if (!linkValue.trim()) return;
    
    try {
      setStatus('PROCESSING');
      // Simulate network delay for fetching metadata
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockMetadata: AudioMetadata = {
        filename: linkValue.split('/').pop() || 'YouTube Audio',
        format: 'stream',
        durationSeconds: 180,
        sampleRate: 44100,
        channels: 2,
        sizeMB: 0
      };
      setMetadata(mockMetadata);

      setStatus('AI_ANALYZING');
      // Simulate AI analysis delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockAnalysis = {
        metadata: mockMetadata,
        features: {
          subEnergy: 0.2,
          bassEnergy: 0.3,
          midEnergy: 0.4,
          highEnergy: 0.1,
          spectralCentroid: 1500,
          zeroCrossingRate: 0.05,
          mfcc: [],
          chroma: [],
          harmonicContent: 50
        },
        beatInfo: {
          bpm: 90,
          confidence: 0.9,
          downbeats: [0, 4, 8, 12],
          kickPositions: [0, 4, 8, 12],
          snarePositions: [2, 6, 10, 14],
          hatPattern: '16th' as const
        },
        silenceMap: {
          regions: [],
          breathingPoints: [],
          fillableSpaces: []
        },
        loopLengthBars: 4 as const
      };

      onUploadComplete(mockAnalysis);
      setStatus('COMPLETE');
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء تحليل الرابط. يرجى التأكد من صحة الرابط والمحاولة مرة أخرى.';
      setError(errorMessage);
      setStatus('ERROR');
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      setError('يرجى اختيار ملف صوتي صالح (MP3, WAV, etc.)');
      setStatus('ERROR');
      return;
    }

    try {
      setStatus('UPLOADING');
      setUploadProgress(0);

      // Simulate chunked upload for larger files
      const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let uploadedBytes = 0;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        // Simulate network delay for each chunk
        await new Promise(resolve => setTimeout(resolve, 150)); 
        
        uploadedBytes += chunk.size;
        setUploadProgress(Math.round((uploadedBytes / file.size) * 100));
      }

      setStatus('PROCESSING');
      const analysis = await audioAnalysisEngine.analyze(file);
      setMetadata(analysis.metadata);
      
      setStatus('AI_ANALYZING');
      // In a real app, we'd call Gemini here to classify the beat
      // For now, we'll simulate it or wait for the parent to handle it
      
      onUploadComplete(analysis);
      setStatus('COMPLETE');
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء معالجة الملف الصوتي. يرجى التأكد من أن الملف غير تالف والمحاولة مرة أخرى.';
      setError(errorMessage);
      setStatus('ERROR');
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {status === 'IDLE' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="border-2 border-dashed border-border-default rounded-2xl p-12 flex flex-col items-center gap-6 hover:border-gold-400/50 hover:bg-gold-400/5 transition-all cursor-pointer group"
            onClick={() => document.getElementById('audio-input')?.click()}
          >
            <input
              id="audio-input"
              type="file"
              className="hidden"
              accept="audio/*"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div className="w-20 h-20 bg-bg-elevated rounded-full flex items-center justify-center border border-border-default group-hover:border-gold-400/30 group-hover:glow-accent transition-all">
              <Upload className="w-8 h-8 text-text-muted group-hover:text-gold-400" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-text-primary mb-2">اسحب وأفلت ملف الموسيقى</h3>
              <p className="text-sm text-text-muted">يدعم MP3, WAV, FLAC حتى 100MB</p>
            </div>
            
            <div className="flex items-center gap-4 w-full max-w-md">
              <div className="h-px flex-1 bg-border-default" />
              <span className="text-[10px] font-mono text-text-muted uppercase">أو</span>
              <div className="h-px flex-1 bg-border-default" />
            </div>

            <div className="flex gap-4 w-full">
              <div className="flex-1 bg-bg-surface border border-border-default rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-gold-400/50 transition-all">
                <LinkIcon className="w-4 h-4 text-text-muted" />
                <input 
                  type="text" 
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  placeholder="رابط SoundCloud أو YouTube..." 
                  className="bg-transparent border-none outline-none text-sm w-full placeholder:text-text-muted/50 text-text-primary"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.key === 'Enter' && handleLinkAnalysis()}
                />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLinkAnalysis();
                }}
                disabled={!linkValue.trim()}
                className="px-6 py-3 bg-gold-400 text-bg-base rounded-xl text-xs font-bold hover:bg-gold-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Zap className="w-3.5 h-3.5" />
                بدء التحليل
              </button>
            </div>
          </motion.div>
        )}

        {(status === 'UPLOADING' || status === 'PROCESSING' || status === 'AI_ANALYZING') && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-bg-surface border border-border-gold rounded-2xl p-12 flex flex-col items-center gap-8"
          >
            <div className="relative">
              <div className="w-24 h-24 border-4 border-gold-400/20 border-t-gold-400 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                {status === 'UPLOADING' ? (
                  <Upload className="w-8 h-8 text-gold-400 animate-pulse" />
                ) : (
                  <Cpu className="w-8 h-8 text-gold-400 animate-pulse" />
                )}
              </div>
            </div>

            {status === 'UPLOADING' && (
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-xs font-mono text-gold-400">
                  <span>جاري الرفع...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gold-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-gold-400">
                {status === 'UPLOADING' ? 'جاري رفع الملف...' : 
                 status === 'PROCESSING' ? 'جاري استخلاص البيانات الصوتية...' : 
                 'AI يُحلل البنية الإيقاعية...'}
              </h3>
              <p className="text-xs font-mono text-text-muted uppercase tracking-widest">
                {metadata?.filename || 'جاري التحميل'}
              </p>
            </div>
          </motion.div>
        )}

        {status === 'ERROR' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-bg-surface border border-quality-low/30 rounded-2xl p-12 flex flex-col items-center gap-6"
          >
            <div className="w-16 h-16 bg-quality-low/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-quality-low" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-quality-low mb-2">فشل التحميل</h3>
              <p className="text-sm text-text-muted">{error}</p>
            </div>
            <button
              onClick={() => setStatus('IDLE')}
              className="px-6 py-2 bg-bg-elevated border border-border-default rounded-lg text-sm hover:bg-bg-hover transition-colors"
            >
              إعادة المحاولة
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
