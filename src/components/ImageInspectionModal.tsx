import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, CheckCircle, AlertTriangle, XCircle, RefreshCw, UserCheck, Edit3, Sparkles, Loader2 } from 'lucide-react';
import { ColumnMapping, ExcelRecord, ExtractedIdentifiers, ImageItem } from '../types';

interface ImageInspectionModalProps {
  image: ImageItem | null;
  onClose: () => void;
  records: ExcelRecord[];
  mapping: ColumnMapping;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onReassignCandidate: (imageId: string, recordId: string) => void;
  onUpdateIdentifiers: (imageId: string, identifiers: ExtractedIdentifiers) => void;
  onUpdateFilename: (imageId: string, filename: string) => void;
  onRetryOcr: (image: ImageItem, engine?: import('../types').OcrEngineType) => Promise<void>;
  onAnalyzeWithAI?: (image: ImageItem) => Promise<void>;
  isAnalyzingAI?: boolean;
}

export const ImageInspectionModal: React.FC<ImageInspectionModalProps> = ({
  image,
  onClose,
  records,
  mapping,
  onApprove,
  onReject,
  onReassignCandidate,
  onUpdateIdentifiers,
  onUpdateFilename,
  onRetryOcr,
  onAnalyzeWithAI,
  isAnalyzingAI,
}) => {
  if (!image) return null;

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(image.rotation || 0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [modalEngine, setModalEngine] = useState<import('../types').OcrEngineType>(
    image.ocrResult?.ocrEngine || 'ensemble'
  );

  // Editable identifiers state
  const [editedName, setEditedName] = useState(image.ocrResult?.extractedIdentifiers.candidateName || '');
  const [editedCheckId, setEditedCheckId] = useState(image.ocrResult?.extractedIdentifiers.checkId || '');
  const [editedRefNo, setEditedRefNo] = useState(image.ocrResult?.extractedIdentifiers.refNo || '');
  const [editedRegNo, setEditedRegNo] = useState(image.ocrResult?.extractedIdentifiers.regNo || '');
  const [editedRollNo, setEditedRollNo] = useState(image.ocrResult?.extractedIdentifiers.rollNo || '');
  const [targetFilename, setTargetFilename] = useState(image.finalFilename || image.proposedFilename || image.name);
  const [candidateSearch, setCandidateSearch] = useState('');

  const currentMatchedRecord = records.find((r) => {
    const matchId = image.manualOverrideRecordId || (image.matchResult && image.matchResult.matchedRecordId);
    return matchId === r.__id;
  });

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleSaveIdentifiers = () => {
    onUpdateIdentifiers(image.id, {
      candidateName: editedName,
      checkId: editedCheckId,
      refNo: editedRefNo,
      regNo: editedRegNo,
      rollNo: editedRollNo,
    });
    onUpdateFilename(image.id, targetFilename);
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetryOcr({ ...image, rotation }, modalEngine);
    } finally {
      setIsRetrying(false);
    }
  };

  const filteredCandidates = records.filter((r) => {
    if (!candidateSearch) return true;
    const term = candidateSearch.toLowerCase();
    const name = (mapping.candidateName && r[mapping.candidateName]?.toLowerCase()) || '';
    const chk = (mapping.checkId && r[mapping.checkId]?.toLowerCase()) || '';
    const ref = (mapping.refNo && r[mapping.refNo]?.toLowerCase()) || '';
    const reg = (mapping.regNo && r[mapping.regNo]?.toLowerCase()) || '';
    return name.includes(term) || chk.includes(term) || ref.includes(term) || reg.includes(term);
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                image.status === 'done'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                  : image.status === 'review'
                  ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                  : 'bg-rose-950 text-rose-300 border border-rose-500/40'
              }`}
            >
              {image.status.toUpperCase()}
            </span>
            <h3 className="text-base font-bold text-white truncate max-w-md">{image.name}</h3>
            <span className="text-xs text-slate-400 font-mono">ID: {image.id}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Left: Interactive Image Viewer (7 Cols) */}
          <div className="lg:col-span-7 bg-slate-950 p-4 flex flex-col items-center justify-between border-b lg:border-b-0 lg:border-r border-slate-800 overflow-hidden relative">
            {/* Viewport Toolbar */}
            <div className="z-10 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs text-slate-300 shadow-lg mb-2">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                title="Zoom Out"
                className="p-1 hover:text-white"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-[11px]">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                title="Zoom In"
                className="p-1 hover:text-white"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-slate-700 mx-1" />
              <button onClick={handleRotate} title="Rotate 90°" className="p-1 hover:text-white flex items-center gap-1">
                <RotateCw className="w-4 h-4" />
                <span>{rotation}°</span>
              </button>
              <div className="h-4 w-px bg-slate-700 mx-1" />
              {/* OCR Model Selector in Modal */}
              <select
                value={modalEngine}
                onChange={(e) => setModalEngine(e.target.value as any)}
                className="bg-slate-900 text-xs text-indigo-300 border border-slate-700 rounded px-2 py-0.5 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ensemble">✨ Ensemble (Paddle+DocTR+Tess)</option>
                <option value="paddleocr">⚡ PaddleOCR (Tables/Angle)</option>
                <option value="doctr">📄 DocTR OCR (Transformer)</option>
                <option value="tesseract">🔍 Tesseract OCR (LSTM)</option>
              </select>

              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{isRetrying ? 'Running...' : 'Re-run'}</span>
              </button>
              {onAnalyzeWithAI && (
                <>
                  <div className="h-4 w-px bg-slate-700 mx-1" />
                  <button
                    onClick={() => onAnalyzeWithAI(image)}
                    disabled={isAnalyzingAI}
                    className="px-2 py-0.5 rounded bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-semibold text-xs flex items-center gap-1 shadow-sm disabled:opacity-50"
                  >
                    {isAnalyzingAI ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                        <span>Fix AI</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Canvas / Image Display */}
            <div className="flex-1 w-full flex items-center justify-center overflow-auto p-4 max-h-[50vh] lg:max-h-[65vh]">
              <div
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-out',
                }}
                className="origin-center shadow-2xl rounded"
              >
                <img
                  src={image.originalUrl || image.previewUrl}
                  alt={image.name}
                  className="max-h-[55vh] object-contain rounded border border-slate-800"
                  style={{ imageRendering: 'auto' }}
                />
              </div>
            </div>

            {/* Image meta footer */}
            <div className="text-[11px] text-slate-400 w-full flex items-center justify-between pt-2 border-t border-slate-900">
              <span>Original Size: {(image.size / 1024).toFixed(1)} KB</span>
              <span>OCR Time: {image.ocrResult?.durationMs || 0} ms</span>
              <span>OCR Confidence: {image.ocrResult?.confidence || 0}%</span>
            </div>
          </div>

          {/* Right: Inspection, OCR Text & Manual Candidate Reassignment (5 Cols) */}
          <div className="lg:col-span-5 p-5 space-y-4 overflow-y-auto max-h-[75vh] bg-slate-900">
            {/* Match Evidence Alert */}
            {image.matchResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs ${
                  image.status === 'done'
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : image.status === 'review'
                    ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                    : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  {image.status === 'done' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : image.status === 'review' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>Match Diagnostic:</span>
                </div>
                <div>{image.matchResult.reason}</div>
                {image.matchResult.matchedCriteria.length > 0 && (
                  <div className="mt-2 text-[11px] font-mono opacity-90">
                    Criteria: {image.matchResult.matchedCriteria.join(' • ')}
                  </div>
                )}
                {image.matchResult.conflicts.length > 0 && (
                  <div className="mt-1 text-[11px] font-semibold text-rose-300">
                    Conflict: {image.matchResult.conflicts.join(' • ')}
                  </div>
                )}
              </div>
            )}

            {/* Target Filename Editor */}
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 space-y-2">
              <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Proposed / Target Filename:</span>
                <span className="text-[11px] text-indigo-400">Preserves original extension</span>
              </label>
              <input
                type="text"
                value={targetFilename}
                onChange={(e) => setTargetFilename(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-xs p-2 rounded-lg"
              />
            </div>

            {/* Extracted Identifiers Form (Editable) */}
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                  Extracted Document Identifiers
                </span>
                <button
                  onClick={handleSaveIdentifiers}
                  className="text-[11px] text-indigo-300 hover:text-white font-medium underline"
                >
                  Apply Changes
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400">Check ID</label>
                  <input
                    type="text"
                    value={editedCheckId}
                    onChange={(e) => setEditedCheckId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white font-mono p-1.5 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Reference Number</label>
                  <input
                    type="text"
                    value={editedRefNo}
                    onChange={(e) => setEditedRefNo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white font-mono p-1.5 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Registration Number</label>
                  <input
                    type="text"
                    value={editedRegNo}
                    onChange={(e) => setEditedRegNo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white font-mono p-1.5 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Roll Number</label>
                  <input
                    type="text"
                    value={editedRollNo}
                    onChange={(e) => setEditedRollNo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white font-mono p-1.5 rounded text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400">Candidate Name</label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-1.5 rounded text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Candidate Reassignment Selector */}
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/80 space-y-2">
              <label className="block text-xs font-semibold text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Matched Excel Candidate:
                </span>
                <span className="text-emerald-400 font-bold">
                  {currentMatchedRecord && mapping.candidateName
                    ? currentMatchedRecord[mapping.candidateName]
                    : 'Unassigned'}
                </span>
              </label>

              <input
                type="text"
                placeholder="Search candidates by name, Check ID, or Ref No..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs p-2 rounded-lg"
              />

              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {filteredCandidates.slice(0, 8).map((cand) => {
                  const isCurrent = currentMatchedRecord?.__id === cand.__id;
                  const cName = mapping.candidateName ? cand[mapping.candidateName] : `Row ${cand.__rowNum}`;
                  const cCheck = mapping.checkId ? cand[mapping.checkId] : '';
                  const cRef = mapping.refNo ? cand[mapping.refNo] : '';

                  return (
                    <div
                      key={cand.__id}
                      onClick={() => onReassignCandidate(image.id, cand.__id)}
                      className={`p-2 rounded cursor-pointer text-xs flex items-center justify-between transition-colors ${
                        isCurrent
                          ? 'bg-indigo-900/60 border border-indigo-500/50 text-white'
                          : 'bg-slate-900/50 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{cName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {cCheck && `CheckID: ${cCheck}`} {cRef && `• Ref: ${cRef}`} • Row: {cand.__rowNum}
                        </div>
                      </div>
                      {isCurrent ? (
                        <span className="text-[10px] bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded">
                          Current
                        </span>
                      ) : (
                        <span className="text-[10px] text-indigo-400 hover:underline">Select</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  handleSaveIdentifiers();
                  onApprove(image.id);
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 shadow"
              >
                <CheckCircle className="w-4 h-4" />
                Approve & Mark DONE
              </button>

              <button
                onClick={() => {
                  onReject(image.id);
                  onClose();
                }}
                className="px-4 py-2.5 rounded-lg text-xs font-bold bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 flex items-center gap-1.5 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Mark Unmatched
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
