import React, { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  CheckCheck,
  Eye,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  AlertOctagon,
  FileQuestion,
  HelpCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { ColumnMapping, ExcelRecord, ImageItem, MatchStatus } from '../types';

interface ReviewTableSectionProps {
  images: ImageItem[];
  records: ExcelRecord[];
  mapping: ColumnMapping;
  onApproveImage: (id: string) => void;
  onRejectImage: (id: string) => void;
  onApproveAllEligible: () => void;
  onSelectImageForInspection: (image: ImageItem) => void;
  onUpdateProposedFilename: (id: string, newFilename: string) => void;
  onProceedToVerification: () => void;
  onBackToProgress: () => void;
  onResolveWithAI?: (image: ImageItem) => Promise<void>;
  onBatchResolveWithAI?: () => Promise<void>;
  isResolvingAI?: boolean;
}

type FilterType = 'all' | 'done' | 'review' | 'not' | 'missing_check' | 'missing_ref' | 'conflicts';

export const ReviewTableSection: React.FC<ReviewTableSectionProps> = ({
  images,
  records,
  mapping,
  onApproveImage,
  onRejectImage,
  onApproveAllEligible,
  onSelectImageForInspection,
  onUpdateProposedFilename,
  onProceedToVerification,
  onBackToProgress,
  onResolveWithAI,
  onBatchResolveWithAI,
  isResolvingAI,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingFilenameId, setEditingFilenameId] = useState<string | null>(null);
  const [tempFilename, setTempFilename] = useState('');

  // Counts
  const doneCount = images.filter((i) => i.status === 'done').length;
  const reviewCount = images.filter((i) => i.status === 'review').length;
  const notCount = images.filter((i) => i.status === 'not').length;
  const missingCheckCount = images.filter((i) => !i.ocrResult?.extractedIdentifiers.checkId).length;
  const missingRefCount = images.filter((i) => !i.ocrResult?.extractedIdentifiers.refNo).length;
  const conflictsCount = images.filter((i) => i.matchResult && i.matchResult.conflicts.length > 0).length;

  // Count eligible for auto-approval: REVIEW status with high confidence and zero conflicts
  const eligibleAutoApproveCount = images.filter(
    (i) => i.status === 'review' && (i.matchResult?.confidenceScore || 0) >= 80 && (i.matchResult?.conflicts.length || 0) === 0
  ).length;

  // Filter & Search images
  const filteredImages = images.filter((img) => {
    // 1. Status Filter
    if (activeFilter === 'done' && img.status !== 'done') return false;
    if (activeFilter === 'review' && img.status !== 'review') return false;
    if (activeFilter === 'not' && img.status !== 'not') return false;
    if (activeFilter === 'missing_check' && img.ocrResult?.extractedIdentifiers.checkId) return false;
    if (activeFilter === 'missing_ref' && img.ocrResult?.extractedIdentifiers.refNo) return false;
    if (activeFilter === 'conflicts' && (!img.matchResult || img.matchResult.conflicts.length === 0)) return false;

    // 2. Search Term
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();

    const matchedRecord = records.find((r) => {
      const matchId = img.manualOverrideRecordId || (img.matchResult && img.matchResult.matchedRecordId);
      return matchId === r.__id;
    });

    const candName = (matchedRecord && mapping.candidateName && matchedRecord[mapping.candidateName]?.toLowerCase()) || '';
    const ocrName = img.ocrResult?.extractedIdentifiers.candidateName?.toLowerCase() || '';
    const ocrCheck = img.ocrResult?.extractedIdentifiers.checkId?.toLowerCase() || '';
    const ocrRef = img.ocrResult?.extractedIdentifiers.refNo?.toLowerCase() || '';
    const ocrReg = img.ocrResult?.extractedIdentifiers.regNo?.toLowerCase() || '';
    const origName = img.name.toLowerCase();
    const finalName = (img.finalFilename || img.proposedFilename || '').toLowerCase();

    return (
      origName.includes(term) ||
      finalName.includes(term) ||
      candName.includes(term) ||
      ocrName.includes(term) ||
      ocrCheck.includes(term) ||
      ocrRef.includes(term) ||
      ocrReg.includes(term)
    );
  });

  const handleStartEditFilename = (img: ImageItem) => {
    setEditingFilenameId(img.id);
    setTempFilename(img.finalFilename || img.proposedFilename || img.name);
  };

  const handleSaveFilename = (id: string) => {
    if (tempFilename.trim()) {
      onUpdateProposedFilename(id, tempFilename.trim());
    }
    setEditingFilenameId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCheck className="w-5 h-5 text-emerald-400" />
              Step 4: Bulk Review, Verification & Match Approval
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Verify matches against document evidence. Strict policy: Never auto-rename unverified or conflicting identities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onBatchResolveWithAI && (reviewCount > 0 || notCount > 0) && (
              <button
                onClick={onBatchResolveWithAI}
                disabled={isResolvingAI}
                className="px-3.5 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all disabled:opacity-50"
              >
                {isResolvingAI ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Gemini AI Resolving...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-purple-200" />
                    <span>Auto-Resolve with AI ({reviewCount + notCount})</span>
                  </>
                )}
              </button>
            )}

            {eligibleAutoApproveCount > 0 && (
              <button
                onClick={onApproveAllEligible}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Approve All Eligible Matches ({eligibleAutoApproveCount})</span>
              </button>
            )}

            <button
              onClick={onProceedToVerification}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md flex items-center gap-1.5 transition-all"
            >
              <span>Export Deliverables & Audit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by filename, candidate name, Check ID, or Ref No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs pl-9 pr-3 py-2 rounded-lg focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Quick Counter Badges */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Total Filtered:</span>
            <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {filteredImages.length} / {images.length}
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Documents ({images.length})
          </button>

          <button
            onClick={() => setActiveFilter('done')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeFilter === 'done'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/50'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>DONE ({doneCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('review')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeFilter === 'review'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-950/40 text-amber-400 border border-amber-800/40 hover:bg-amber-900/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>REVIEW ({reviewCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('not')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeFilter === 'not'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-950/40 text-rose-400 border border-rose-800/40 hover:bg-rose-900/50'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>NOT MATCHED ({notCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('conflicts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeFilter === 'conflicts'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-rose-400 hover:bg-slate-700'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Conflicts ({conflictsCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('missing_check')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeFilter === 'missing_check'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <span>Missing Check ID ({missingCheckCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('missing_ref')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeFilter === 'missing_ref'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <span>Missing Ref No ({missingRefCount})</span>
          </button>
        </div>
      </div>

      {/* Main Results Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-14">Doc</th>
                <th className="py-3 px-4">Original Filename</th>
                <th className="py-3 px-4">OCR Extracted Identifiers</th>
                <th className="py-3 px-4">Matched Excel Candidate</th>
                <th className="py-3 px-4">Proposed Target Filename</th>
                <th className="py-3 px-4">Status & Evidence</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredImages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                    No documents match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredImages.map((img) => {
                  const matchedRecord = records.find((r) => {
                    const matchId = img.manualOverrideRecordId || (img.matchResult && img.matchResult.matchedRecordId);
                    return matchId === r.__id;
                  });

                  const candidateName =
                    matchedRecord && mapping.candidateName ? matchedRecord[mapping.candidateName] : 'Unmatched';
                  const rowNum = matchedRecord ? matchedRecord.__rowNum : 'N/A';

                  const isDone = img.status === 'done';
                  const isReview = img.status === 'review';
                  const isNot = img.status === 'not';

                  return (
                    <tr
                      key={img.id}
                      className={`hover:bg-slate-800/50 transition-colors ${
                        isDone
                          ? 'bg-emerald-950/10'
                          : isReview
                          ? 'bg-amber-950/10'
                          : 'bg-rose-950/10'
                      }`}
                    >
                      {/* Image Thumbnail */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onSelectImageForInspection(img)}
                          title="Click to zoom, rotate, inspect, or edit OCR"
                          className="relative w-11 h-14 bg-slate-950 rounded border border-slate-700 overflow-hidden group cursor-pointer block"
                        >
                          <img src={img.originalUrl || img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                        </button>
                      </td>

                      {/* Original Filename */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200 truncate max-w-[170px]" title={img.name}>
                          {img.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{(img.size / 1024).toFixed(1)} KB</div>
                      </td>

                      {/* OCR Extracted Identifiers */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 text-[11px]">
                          {img.ocrResult?.extractedIdentifiers.checkId && (
                            <div className="font-mono text-cyan-300">
                              Check ID: <span className="font-bold">{img.ocrResult.extractedIdentifiers.checkId}</span>
                            </div>
                          )}
                          {img.ocrResult?.extractedIdentifiers.refNo && (
                            <div className="font-mono text-indigo-300">
                              Ref No: <span>{img.ocrResult.extractedIdentifiers.refNo}</span>
                            </div>
                          )}
                          {img.ocrResult?.extractedIdentifiers.regNo && (
                            <div className="font-mono text-emerald-300">
                              Reg No: <span>{img.ocrResult.extractedIdentifiers.regNo}</span>
                            </div>
                          )}
                          {img.ocrResult?.extractedIdentifiers.candidateName && (
                            <div className="text-slate-300 font-medium">
                              Name: {img.ocrResult.extractedIdentifiers.candidateName}
                            </div>
                          )}
                          {!img.ocrResult?.extractedIdentifiers.checkId &&
                            !img.ocrResult?.extractedIdentifiers.refNo &&
                            !img.ocrResult?.extractedIdentifiers.candidateName && (
                              <span className="text-slate-500 italic text-[10px]">No clear identifiers detected</span>
                            )}
                        </div>
                      </td>

                      {/* Matched Excel Candidate */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white truncate max-w-[170px]">{candidateName}</div>
                        <div className="text-[10px] text-slate-400">
                          {matchedRecord ? `Excel Row: #${rowNum}` : 'Not found in sheet'}
                        </div>
                      </td>

                      {/* Proposed Target Filename (Editable inline) */}
                      <td className="py-3 px-4">
                        {editingFilenameId === img.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={tempFilename}
                              onChange={(e) => setTempFilename(e.target.value)}
                              className="bg-slate-950 border border-slate-700 text-emerald-400 font-mono text-xs px-2 py-1 rounded w-44"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveFilename(img.id)}
                              className="text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-500"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingFilenameId(null)}
                              className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded hover:bg-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleStartEditFilename(img)}
                            title="Click to edit filename"
                            className="font-mono font-bold text-emerald-400 truncate max-w-[190px] cursor-pointer hover:underline"
                          >
                            {img.finalFilename || img.proposedFilename || img.name}
                          </div>
                        )}
                        {img.collisionIndex ? (
                          <span className="text-[10px] text-indigo-400 bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-700/40">
                            Duplicate suffix ({String(img.collisionIndex).padStart(2, '0')})
                          </span>
                        ) : null}
                      </td>

                      {/* Status & Evidence Note */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isDone
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                : isReview
                                ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {img.status.toUpperCase()}
                          </span>
                          {img.matchResult && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {img.matchResult.confidenceScore}% conf
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1 max-w-[200px]" title={img.reviewNotes || img.matchResult?.reason}>
                          {img.reviewNotes || img.matchResult?.reason || 'Awaiting review'}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectImageForInspection(img)}
                            title="Inspect Image & OCR Text"
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {onResolveWithAI && !isDone && (
                            <button
                              onClick={() => onResolveWithAI(img)}
                              title="Fix / Verify with Gemini Multimodal AI"
                              className="px-2 py-1 rounded bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800/60 transition-colors flex items-center gap-1 text-[11px] font-semibold"
                            >
                              <Sparkles className="w-3 h-3 text-purple-400" />
                              <span className="hidden sm:inline">AI Fix</span>
                            </button>
                          )}

                          {!isDone && (
                            <button
                              onClick={() => onApproveImage(img.id)}
                              title="Approve Match as DONE"
                              className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                            >
                              Approve
                            </button>
                          )}

                          {!isNot && (
                            <button
                              onClick={() => onRejectImage(img.id)}
                              title="Reject & Mark as Unmatched"
                              className="p-1.5 rounded bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
        <button
          onClick={onBackToProgress}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to OCR Progress
        </button>

        <button
          onClick={onProceedToVerification}
          className="px-6 py-2.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 flex items-center gap-2"
        >
          <span>Run Two-Pass Audit & Generate 4 Deliverables</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
