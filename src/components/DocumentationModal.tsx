import React from 'react';
import { X, Globe, Server, HardDrive, ShieldCheck, Terminal, BookOpen } from 'lucide-react';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">System Guide & Free Hosting Deployment</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs text-slate-300">
          {/* Privacy & Zero Server Cost */}
          <div className="bg-emerald-950/40 border border-emerald-800/60 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>100% Free & 100% Client-Side Architecture</span>
            </div>
            <p className="text-slate-300">
              This application has no backend server, no database, and no paid API keys. All OCR operations run in the browser using Tesseract.js Web Workers and HTML5 Canvas. Your sensitive student marksheets and identity cards never leave your local computer.
            </p>
          </div>

          {/* Local Run Instructions */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              1. Local Installation & Development
            </h4>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
              <div># 1. Install dependencies</div>
              <div className="text-emerald-400">npm install</div>
              <div className="mt-2"># 2. Run local development server (Port 3000)</div>
              <div className="text-emerald-400">npm run dev</div>
              <div className="mt-2"># 3. Build optimized production bundle</div>
              <div className="text-emerald-400">npm run build</div>
            </div>
          </div>

          {/* Free Hosting Platforms */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              2. Deploying on 100% Free Static Hosting
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/80 space-y-1.5">
                <div className="font-bold text-white">Cloudflare Pages</div>
                <p className="text-[11px] text-slate-400">
                  Build command: <code className="text-cyan-300 font-mono">npm run build</code>
                  <br />
                  Output directory: <code className="text-emerald-300 font-mono">dist</code>
                  <br />
                  Free SSL, unlimited bandwidth, edge caching.
                </p>
              </div>

              <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/80 space-y-1.5">
                <div className="font-bold text-white">Vercel Hobby</div>
                <p className="text-[11px] text-slate-400">
                  Framework: <code className="text-cyan-300 font-mono">Vite</code>
                  <br />
                  Build command: <code className="text-cyan-300 font-mono">npm run build</code>
                  <br />
                  Output directory: <code className="text-emerald-300 font-mono">dist</code>
                </p>
              </div>

              <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/80 space-y-1.5">
                <div className="font-bold text-white">Netlify Free</div>
                <p className="text-[11px] text-slate-400">
                  Publish directory: <code className="text-emerald-300 font-mono">dist</code>
                  <br />
                  Deploy in under 30 seconds straight from GitHub.
                </p>
              </div>
            </div>
          </div>

          {/* OCR Worker & Offline Guidance */}
          <div className="space-y-2 bg-slate-850 p-4 rounded-xl border border-slate-800 bg-slate-800/40">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-400" />
              3. Offline Capabilities & Memory Management
            </h4>
            <p className="text-slate-300 leading-relaxed">
              <strong>Offline Execution:</strong> Tesseract downloads the English language model (~4MB) on first initialization. After that initial download, the browser caches the worker and traineddata in indexedDB/browser cache, allowing the application to process batches completely offline without internet connectivity.
            </p>
            <p className="text-slate-300 leading-relaxed">
              <strong>500 Image Memory Safeguard:</strong> This application generates compact 300px compressed thumbnails and cleans up object URLs immediately, keeping DOM heap allocation minimal even with 500 high-resolution scans.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-end bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
