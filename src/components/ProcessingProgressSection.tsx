import React from 'react';
import { Play, Pause, XCircle, CheckCircle2, AlertTriangle, Cpu, Loader2, Sparkles, SlidersHorizontal, Layers } from 'lucide-react';
import { ImageItem, OcrEngineType } from '../types';

interface ProcessingProgressSectionProps {
  images: ImageItem[];
  currentIndex: number;
  isProcessing: boolean;
  isPaused: boolean;
  concurrency: number;
  onConcurrencyChange: (val: number) => void;
  boostContrast: boolean;
  onBoostContrastChange: (val: boolean) => void;
  ocrEngine: OcrEngineType;
  onOcrEngineChange: (engine: OcrEngineType) => void;
  onStartProcessing: () => void;
  onPauseProcessing: () => void;
  onResumeProcessing: () => void;
  onCancelProcessing: () => void;
  onProceedToReview: () => void;
}

export const ProcessingProgressSection: React.FC<ProcessingProgressSectionProps> = ({
  images,
  currentIndex,
  isProcessing,
  isPaused,
  concurrency,
  onConcurrencyChange,
  boostContrast,
  onBoostContrastChange,
  ocrEngine,
  onOcrEngineChange,
  onStartProcessing,
  onPauseProcessing,
  onResumeProcessing,
  onCancelProcessing,
  onProceedToReview,
}) => {
  const total = images.length;
  const processed = images.filter((img) => img.ocrResult !== undefined || img.status === 'not' || img.status === 'done' || img.status === 'review').length;
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;

  const doneCount = images.filter((i) => i.status === 'done').length;
  const reviewCount = images.filter((i) => i.status === 'review').length;
  const notCount = images.filter((i) => i.status === 'not').length;
  const isComplete = total > 0 && processed === total;

  const currentImage = images[currentIndex] || images[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              Step 3: Client-Side OCR & Evidence-Based Matching Engine
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Local Tesseract.js worker pool extracts Check IDs, Ref Numbers, and student details with zero cloud uploads.
            </p>
          </div>

          {/* Engine Parameters */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-white">OCR Model:</span>
              <select
                value={ocrEngine}
                disabled={isProcessing && !isPaused}
                onChange={(e) => onOcrEngineChange(e.target.value as OcrEngineType)}
                className="bg-slate-900 text-white font-medium rounded text-xs px-2.5 py-1 border border-indigo-500/50 focus:ring-1 focus:ring-indigo-400"
              >
                <option value="ensemble">✨ Multi-Engine Ensemble (PaddleOCR + DocTR + Tesseract)</option>
                <option value="paddleocr">⚡ PaddleOCR (PP-OCRv4 Layout & Tables)</option>
                <option value="doctr">📄 DocTR OCR (Transformer Document Reader)</option>
                <option value="tesseract">🔍 Tesseract OCR (Standard LSTM)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Workers:</span>
              <select
                value={concurrency}
                disabled={isProcessing && !isPaused}
                onChange={(e) => onConcurrencyChange(Number(e.target.value))}
                className="bg-slate-900 text-white rounded text-xs px-2 py-1 border border-slate-700"
              >
                <option value={1}>1 Worker</option>
                <option value={2}>2 Workers</option>
                <option value={3}>3 Workers</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={boostContrast}
                disabled={isProcessing && !isPaused}
                onChange={(e) => onBoostContrastChange(e.target.checked)}
                className="rounded text-indigo-500"
              />
              <span>Canvas Contrast Boost</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Progress Control Board */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        {/* Progress Bar & Counters */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
            <span className="flex items-center gap-2">
              {isProcessing && !isPaused && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
              {isComplete ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Batch OCR & Matching Finished!
                </span>
              ) : isPaused ? (
                <span className="text-amber-400">Processing Paused</span>
              ) : isProcessing ? (
                <span className="text-indigo-300">Processing Batch: {processed} / {total} files</span>
              ) : (
                <span className="text-slate-400">Ready to start matching</span>
              )}
            </span>
            <span className="font-mono text-indigo-300 text-sm">{percent}%</span>
          </div>

          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Live Status Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 text-center">
            <div className="text-2xl font-bold text-white">{processed} / {total}</div>
            <div className="text-xs text-slate-400 mt-1">Processed Documents</div>
          </div>
          <div className="bg-emerald-950/40 p-4 rounded-xl border border-emerald-800/50 text-center">
            <div className="text-2xl font-bold text-emerald-400">{doneCount}</div>
            <div className="text-xs text-emerald-300 mt-1">DONE (Verified Matches)</div>
          </div>
          <div className="bg-amber-950/40 p-4 rounded-xl border border-amber-800/50 text-center">
            <div className="text-2xl font-bold text-amber-400">{reviewCount}</div>
            <div className="text-xs text-amber-300 mt-1">REVIEW (Ambiguous / Conflicting)</div>
          </div>
          <div className="bg-rose-950/40 p-4 rounded-xl border border-rose-800/50 text-center">
            <div className="text-2xl font-bold text-rose-400">{notCount}</div>
            <div className="text-xs text-rose-300 mt-1">NOT (Unreadable / Absent)</div>
          </div>
        </div>

        {/* Current Active Item Card */}
        {currentImage && (isProcessing || isComplete) && (
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/70 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-16 h-20 bg-slate-950 rounded-lg overflow-hidden border border-slate-700 shrink-0 flex items-center justify-center">
              <img src={currentImage.originalUrl || currentImage.previewUrl} alt={currentImage.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 text-xs space-y-1 text-slate-300">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white truncate max-w-xs">{currentImage.name}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    currentImage.status === 'done'
                      ? 'bg-emerald-900 text-emerald-200'
                      : currentImage.status === 'review'
                      ? 'bg-amber-900 text-amber-200'
                      : currentImage.status === 'not'
                      ? 'bg-rose-900 text-rose-200'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {currentImage.status.toUpperCase()}
                </span>
              </div>
              <div className="text-slate-400 font-mono text-[11px]">
                Target: {currentImage.finalFilename || currentImage.proposedFilename || 'Computing...'}
              </div>
              {currentImage.matchResult && (
                <div className="text-slate-300 text-[11px]">
                  Evidence: {currentImage.matchResult.matchedCriteria[0] || currentImage.matchResult.reason}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2">
            {!isProcessing && !isComplete && (
              <button
                onClick={onStartProcessing}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-md transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                Start Processing Batch
              </button>
            )}

            {isProcessing && !isPaused && (
              <button
                onClick={onPauseProcessing}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition-colors"
              >
                <Pause className="w-3.5 h-3.5" />
                Pause
              </button>
            )}

            {isProcessing && isPaused && (
              <button
                onClick={onResumeProcessing}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                Resume
              </button>
            )}

            {isProcessing && (
              <button
                onClick={onCancelProcessing}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel
              </button>
            )}
          </div>

          <button
            onClick={onProceedToReview}
            disabled={processed === 0}
            className="px-6 py-2.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Review & Approve Results Table ({processed} ready)
          </button>
        </div>
      </div>
    </div>
  );
};
