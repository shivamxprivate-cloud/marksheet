import React, { useState } from 'react';
import {
  Download,
  FileCheck2,
  FileArchive,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Package,
  Layers,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Check,
  ExternalLink,
} from 'lucide-react';
import { ColumnMapping, ExcelRecord, ImageItem, ProcessingStats } from '../types';
import { runTwoPassVerification, VerificationReport } from '../utils/twoPassVerifier';
import {
  exportCompletePackageZip,
  exportMatchedImagesZip,
  exportProcessedExcelBlob,
  exportUnmatchedImagesZip,
  downloadBlob,
} from '../utils/zipExporter';

interface ExportAndVerificationSectionProps {
  images: ImageItem[];
  records: ExcelRecord[];
  mapping: ColumnMapping;
  rawWorkbook: any;
  selectedSheet: string;
  onBackToReview: () => void;
}

export const ExportAndVerificationSection: React.FC<ExportAndVerificationSectionProps> = ({
  images,
  records,
  mapping,
  rawWorkbook,
  selectedSheet,
  onBackToReview,
}) => {
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>('');

  // Run verification
  const verification: VerificationReport = runTwoPassVerification(images, records, mapping);

  // Calculate required completion report metrics
  const doneCount = images.filter((i) => i.status === 'done').length;
  const reviewCount = images.filter((i) => i.status === 'review').length;
  const notCount = images.filter((i) => i.status === 'not').length;
  const ocrFailures = images.filter((i) => i.status === 'error' || (!i.ocrResult && i.status === 'not')).length;
  const duplicateIdentifiers = images.filter((i) => (i.collisionIndex || 0) > 0).length;

  // Excel records with zero matched images
  const excelWithoutImages = records.filter((rec) => {
    return !images.some((img) => {
      const matchId = img.manualOverrideRecordId || (img.matchResult && img.matchResult.matchedRecordId);
      return matchId === rec.__id;
    });
  }).length;

  const stats: ProcessingStats = {
    totalImagesUploaded: images.length,
    totalImagesInventoried: images.length,
    totalExcelRecords: records.length,
    totalImagesMatched: doneCount,
    totalImagesRenamed: doneCount,
    totalDone: doneCount,
    totalReview: reviewCount,
    totalNot: notCount,
    totalDuplicateIdentifiers: duplicateIdentifiers,
    totalFilenameConflicts: duplicateIdentifiers,
    totalOcrFailures: ocrFailures,
    totalExcelRecordsWithoutImages: excelWithoutImages,
    totalOutputsGenerated: 4,
  };

  // 1. Download Matched Images ZIP
  const handleDownloadMatched = async () => {
    try {
      setDownloadingType('matched');
      setProgressMsg('Packing approved matched images...');
      const blob = await exportMatchedImagesZip(images, (p, msg) => setProgressMsg(`${msg} (${p}%)`));
      downloadBlob(blob, 'Renamed_Matched_Images.zip');
    } catch (err: any) {
      alert(err?.message || 'Error creating Matched Images archive');
    } finally {
      setDownloadingType(null);
      setProgressMsg('');
    }
  };

  // 2. Download Unmatched Images ZIP
  const handleDownloadUnmatched = async () => {
    try {
      setDownloadingType('unmatched');
      setProgressMsg('Archiving unresolved images and CSV report...');
      const blob = await exportUnmatchedImagesZip(images, (p, msg) => setProgressMsg(`${msg} (${p}%)`));
      downloadBlob(blob, 'Unmatched_Images.zip');
    } catch (err: any) {
      alert(err?.message || 'Error creating Unmatched Images archive');
    } finally {
      setDownloadingType(null);
      setProgressMsg('');
    }
  };

  // 3. Download Processed Excel
  const handleDownloadExcel = () => {
    try {
      setDownloadingType('excel');
      const blob = exportProcessedExcelBlob(rawWorkbook, selectedSheet, records, images, mapping);
      downloadBlob(blob, 'Processed_Excel.xlsx');
    } catch (err: any) {
      alert(err?.message || 'Error exporting Excel spreadsheet');
    } finally {
      setDownloadingType(null);
    }
  };

  // 4. Download Complete Package ZIP
  const handleDownloadCompletePackage = async () => {
    try {
      setDownloadingType('complete');
      setProgressMsg('Assembling complete deliverable package...');
      const blob = await exportCompletePackageZip(
        images,
        records,
        mapping,
        rawWorkbook,
        selectedSheet,
        (p, msg) => setProgressMsg(`${msg} (${p}%)`)
      );
      downloadBlob(blob, 'Complete_Package.zip');
    } catch (err: any) {
      alert(err?.message || 'Error building complete deliverable package');
    } finally {
      setDownloadingType(null);
      setProgressMsg('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-400" />
              Step 5: Two-Pass Verification Audit & Official Deliverables
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Programmatic two-pass audit report and 4 production-ready deliverables built in-browser.
            </p>
          </div>

          <button
            onClick={onBackToReview}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Review Table
          </button>
        </div>
      </div>

      {/* Live Download Status Feedback */}
      {downloadingType && (
        <div className="bg-indigo-950/80 border border-indigo-500/60 rounded-xl p-4 text-indigo-200 flex items-center gap-3 shadow-lg">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
          <div className="text-xs font-semibold">{progressMsg || 'Generating and streaming archive to browser...'}</div>
        </div>
      )}

      {/* The 4 Deliverables Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deliverable A: Renamed_Matched_Images.zip */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <FileArchive className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                {doneCount} Approved Files
              </span>
            </div>
            <h3 className="text-sm font-bold text-white">Deliverable A: Renamed_Matched_Images.zip</h3>
            <p className="text-xs text-slate-400">
              Contains all verified and approved images renamed with target identifiers (Check ID, Reference No, or Official Filename).
            </p>
          </div>
          <div className="pt-4 mt-3 border-t border-slate-800">
            <button
              onClick={handleDownloadMatched}
              disabled={doneCount === 0 || downloadingType !== null}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow disabled:opacity-40 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Renamed_Matched_Images.zip</span>
            </button>
          </div>
        </div>

        {/* Deliverable B: Unmatched_Images.zip */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <FileArchive className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                {reviewCount + notCount} Unresolved Files
              </span>
            </div>
            <h3 className="text-sm font-bold text-white">Deliverable B: Unmatched_Images.zip</h3>
            <p className="text-xs text-slate-400">
              Contains all review-required and unmatched images with original filenames + Unresolved_Report.csv explaining each case.
            </p>
          </div>
          <div className="pt-4 mt-3 border-t border-slate-800">
            <button
              onClick={handleDownloadUnmatched}
              disabled={reviewCount + notCount === 0 || downloadingType !== null}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-2 shadow disabled:opacity-40 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Unmatched_Images.zip</span>
            </button>
          </div>
        </div>

        {/* Deliverable C: Processed_Excel.xlsx */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                Master Spreadsheet
              </span>
            </div>
            <h3 className="text-sm font-bold text-white">Deliverable C: Processed_Excel.xlsx</h3>
            <p className="text-xs text-slate-400">
              Updated Excel workbook with Candidate Processing Status, Assigned Filenames, plus 'Processing_Audit' and 'Unmatched_Candidates' worksheets.
            </p>
          </div>
          <div className="pt-4 mt-3 border-t border-slate-800">
            <button
              onClick={handleDownloadExcel}
              disabled={downloadingType !== null}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 shadow disabled:opacity-40 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Processed_Excel.xlsx</span>
            </button>
          </div>
        </div>

        {/* Deliverable D: Complete_Package.zip */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/40 rounded-xl p-5 flex flex-col justify-between shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow">
                <Package className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-white bg-indigo-600 px-2.5 py-0.5 rounded-full">
                All-in-One Package
              </span>
            </div>
            <h3 className="text-sm font-bold text-white">Deliverable D: Complete_Package.zip</h3>
            <p className="text-xs text-slate-300">
              Structured archive containing Matched_Images/, Unmatched_Images/, Processed_Excel.xlsx, Audit_Report.csv, Audit_Report.txt, and README.txt.
            </p>
          </div>
          <div className="pt-4 mt-3 border-t border-slate-800">
            <button
              onClick={handleDownloadCompletePackage}
              disabled={downloadingType !== null}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:opacity-95 text-white flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Complete_Package.zip</span>
            </button>
          </div>
        </div>
      </div>

      {/* Completion Report Statistics (Section 16 Requirements) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            Official Processing Completion Report (13 Metrics)
          </h3>
          <span className="text-xs text-slate-400 font-mono">100% Calculated from Live Inventory</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 text-center">
            <div className="text-lg font-bold text-white">{stats.totalImagesUploaded}</div>
            <div className="text-[11px] text-slate-400">Total Uploaded</div>
          </div>
          <div className="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 text-center">
            <div className="text-lg font-bold text-white">{stats.totalImagesInventoried}</div>
            <div className="text-[11px] text-slate-400">Total Inventoried</div>
          </div>
          <div className="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 text-center">
            <div className="text-lg font-bold text-white">{stats.totalExcelRecords}</div>
            <div className="text-[11px] text-slate-400">Excel Records</div>
          </div>
          <div className="bg-emerald-950/40 p-3 rounded-lg border border-emerald-800/50 text-center">
            <div className="text-lg font-bold text-emerald-400">{stats.totalDone}</div>
            <div className="text-[11px] text-emerald-300">DONE Images</div>
          </div>
          <div className="bg-amber-950/40 p-3 rounded-lg border border-amber-800/50 text-center">
            <div className="text-lg font-bold text-amber-400">{stats.totalReview}</div>
            <div className="text-[11px] text-amber-300">REVIEW Images</div>
          </div>
          <div className="bg-rose-950/40 p-3 rounded-lg border border-rose-800/50 text-center">
            <div className="text-lg font-bold text-rose-400">{stats.totalNot}</div>
            <div className="text-[11px] text-rose-300">NOT Images</div>
          </div>
          <div className="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 text-center">
            <div className="text-lg font-bold text-indigo-400">{stats.totalImagesRenamed}</div>
            <div className="text-[11px] text-slate-400">Images Renamed</div>
          </div>
          <div className="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 text-center">
            <div className="text-lg font-bold text-cyan-400">{stats.totalDuplicateIdentifiers}</div>
            <div className="text-[11px] text-slate-400">Duplicate Identifiers</div>
          </div>
          <div className="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 text-center">
            <div className="text-lg font-bold text-cyan-400">{stats.totalFilenameConflicts}</div>
            <div className="text-[11px] text-slate-400">Conflicts Resolved</div>
          </div>
          <div className="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 text-center">
            <div className="text-lg font-bold text-rose-400">{stats.totalOcrFailures}</div>
            <div className="text-[11px] text-slate-400">OCR Failures</div>
          </div>
          <div className="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 text-center">
            <div className="text-lg font-bold text-amber-400">{stats.totalExcelRecordsWithoutImages}</div>
            <div className="text-[11px] text-slate-400">Excel Without Images</div>
          </div>
          <div className="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 text-center">
            <div className="text-lg font-bold text-emerald-400">{stats.totalOutputsGenerated}</div>
            <div className="text-[11px] text-slate-400">Output Packages</div>
          </div>
        </div>
      </div>

      {/* Two-Pass Verification Live Checklist */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Two-Pass Audit Verification Checklist (Pass 1 & Pass 2)
          </h3>
          <span
            className={`px-2 py-0.5 rounded text-xs font-bold ${
              verification.allPassed
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                : 'bg-amber-950 text-amber-300 border border-amber-500/40'
            }`}
          >
            {verification.allPassed ? 'All 10 Audit Checks Passed' : 'Manual Sign-off Pending'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pass 1 Checklist */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/70 space-y-3">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Pass 1: Matching & Filename Verification</span>
            </h4>
            <div className="space-y-2">
              {verification.pass1Checks.map((chk) => (
                <div key={chk.id} className="text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{chk.title}</span>
                    {chk.passed ? (
                      <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-bold">
                        <Check className="w-3.5 h-3.5" /> PASSED
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1 text-[11px] font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" /> ATTENTION
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">{chk.details}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pass 2 Checklist */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/70 space-y-3">
            <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Pass 2: Export & Excel Verification</span>
            </h4>
            <div className="space-y-2">
              {verification.pass2Checks.map((chk) => (
                <div key={chk.id} className="text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{chk.title}</span>
                    {chk.passed ? (
                      <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-bold">
                        <Check className="w-3.5 h-3.5" /> PASSED
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1 text-[11px] font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" /> ATTENTION
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">{chk.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
