import React from 'react';
import { ShieldCheck, HelpCircle, RefreshCw, Sparkles, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';

interface HeaderProps {
  currentStep: number;
  totalImages: number;
  totalExcelRecords: number;
  onResetSession: () => void;
  onLoadSampleData: () => void;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  totalImages,
  totalExcelRecords,
  onResetSession,
  onLoadSampleData,
  onOpenHelp,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                DocuMatch & Rename Automator
              </h1>
              <span className="text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                v2.6 Client-Side
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Bulk 500-Image OCR Matcher, Collision-Safe Renamer & Excel Verification
            </p>
          </div>
        </div>

        {/* Live Counters & Privacy Badge */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Local Privacy</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Gemini AI Multimodal</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-xs">
            <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>{totalImages} / 500 Images</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-xs">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>{totalExcelRecords} Records</span>
          </div>

          {/* Action buttons */}
          <button
            onClick={onLoadSampleData}
            title="Load 10 realistic synthetic marksheet images and matching Excel test workbook"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample Test Suite</span>
          </button>

          <button
            onClick={onOpenHelp}
            title="Deployment & Documentation"
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={onResetSession}
            title="Clear Session"
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
