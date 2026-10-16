import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, Trash2, AlertTriangle, CheckCircle2, Files, Info, Plus, Image as ImageIcon, Sparkles, Layers } from 'lucide-react';
import { ImageItem, OcrEngineType } from '../types';
import { createThumbnail, formatBytes } from '../utils/imageUtils';

interface UploadSectionProps {
  images: ImageItem[];
  onAddImages: (newImages: ImageItem[]) => void;
  onRemoveImage: (id: string) => void;
  onClearImages: () => void;
  excelFile: File | null;
  excelSheetCount: number;
  excelRecordCount: number;
  onExcelUpload: (file: File) => void;
  onProceedToMapping: () => void;
  onGenerateBatch: (count: number) => Promise<void>;
  isGeneratingBatch: boolean;
  onSelectImageForInspection?: (image: ImageItem) => void;
  ocrEngine?: OcrEngineType;
  onOcrEngineChange?: (engine: OcrEngineType) => void;
}

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif'];
const MAX_IMAGES_LIMIT = 500;

export const UploadSection: React.FC<UploadSectionProps> = ({
  images,
  onAddImages,
  onRemoveImage,
  onClearImages,
  excelFile,
  excelSheetCount,
  excelRecordCount,
  onExcelUpload,
  onProceedToMapping,
  onGenerateBatch,
  isGeneratingBatch,
  onSelectImageForInspection,
  ocrEngine,
  onOcrEngineChange,
}) => {
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [isDraggingExcel, setIsDraggingExcel] = useState(false);
  const [unsupportedFiles, setUnsupportedFiles] = useState<{ name: string; reason: string }[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Analyze duplicate original filenames
  const originalNames = images.map((i) => i.name.toLowerCase());
  const duplicateNameCount = originalNames.length - new Set(originalNames).size;
  const totalSizeBytes = images.reduce((acc, curr) => acc + curr.size, 0);

  const isOverLimit = images.length > MAX_IMAGES_LIMIT;

  const processSelectedImageFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    const validItems: ImageItem[] = [];
    const rejected: { name: string; reason: string }[] = [];

    for (const file of fileList) {
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        rejected.push({ name: file.name, reason: `Unsupported extension "${ext}". Allowed: JPG, PNG, WEBP, BMP, TIFF.` });
        continue;
      }

      try {
        const { previewUrl, originalUrl, width, height } = await createThumbnail(file, 800);
        const item: ImageItem = {
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          previewUrl,
          originalUrl,
          width,
          height,
          rotation: 0,
          status: 'pending',
        };
        validItems.push(item);
      } catch (err: any) {
        rejected.push({ name: file.name, reason: err?.message || 'Failed to decode image file' });
      }
    }

    if (rejected.length > 0) {
      setUnsupportedFiles((prev) => [...prev, ...rejected]);
    }

    if (validItems.length > 0) {
      onAddImages(validItems);
    }
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImages(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedImageFiles(e.dataTransfer.files);
    }
  };

  const handleExcelDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingExcel(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        onExcelUpload(file);
      }
    }
  };

  const trimExcessImages = () => {
    if (images.length > MAX_IMAGES_LIMIT) {
      const trimmed = images.slice(0, MAX_IMAGES_LIMIT);
      onClearImages();
      onAddImages(trimmed);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/80 rounded-xl p-5 text-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Step 1: Upload Candidate Document Images & Master Excel
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Directly upload up to 500 marksheets, certificates, or identity document images. No ZIP file required.
            </p>
          </div>

          {/* Quick test generator */}
          <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Stress Test Batch:
            </span>
            <button
              onClick={() => onGenerateBatch(50)}
              disabled={isGeneratingBatch}
              className="px-2.5 py-1 text-xs font-medium rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50 hover:bg-indigo-900 transition-colors disabled:opacity-50"
            >
              +50 Images
            </button>
            <button
              onClick={() => onGenerateBatch(100)}
              disabled={isGeneratingBatch}
              className="px-2.5 py-1 text-xs font-medium rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50 hover:bg-indigo-900 transition-colors disabled:opacity-50"
            >
              +100 Images
            </button>
            <button
              onClick={() => onGenerateBatch(500)}
              disabled={isGeneratingBatch}
              className="px-2.5 py-1 text-xs font-medium rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50 hover:bg-indigo-900 transition-colors disabled:opacity-50"
            >
              Full 500 Batch
            </button>
          </div>
        </div>
      </div>

      {/* OCR Engine Selection Panel */}
      {ocrEngine && onOcrEngineChange && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>OCR Extraction Model:</span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono text-[10px] uppercase">
                  {ocrEngine}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Choose the neural recognition engine optimized for your document types
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={ocrEngine}
              onChange={(e) => onOcrEngineChange(e.target.value as any)}
              className="bg-slate-800 text-white font-medium rounded-lg text-xs px-3 py-1.5 border border-indigo-500/50 focus:ring-1 focus:ring-indigo-400 w-full sm:w-auto"
            >
              <option value="ensemble">✨ Multi-Engine Ensemble (PaddleOCR + DocTR + Tesseract)</option>
              <option value="paddleocr">⚡ PaddleOCR (PP-OCRv4 Layout, Skewed & Multi-Angle Scans)</option>
              <option value="doctr">📄 DocTR OCR (Transformer Layout & Field Recognition)</option>
              <option value="tesseract">🔍 Tesseract OCR (Character LSTM Model)</option>
            </select>
          </div>
        </div>
      )}

      {/* Warning if over 500 limit */}
      {isOverLimit && (
        <div className="bg-amber-950/70 border border-amber-600/60 rounded-xl p-4 text-amber-200 flex items-start justify-between gap-3 shadow-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-300">
                Batch Size Exceeded: {images.length} images selected (Maximum allowed: {MAX_IMAGES_LIMIT})
              </h3>
              <p className="text-xs text-amber-200/90 mt-1">
                To guarantee browser tab memory stability and avoid worker crashes, batches are limited to 500 images.
                Please trim the excess {images.length - MAX_IMAGES_LIMIT} images or split them into a second session.
              </p>
            </div>
          </div>
          <button
            onClick={trimExcessImages}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shrink-0"
          >
            Trim to 500 Images
          </button>
        </div>
      )}

      {/* Dual Upload Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Images Upload (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingImages(true);
            }}
            onDragLeave={() => setIsDraggingImages(false)}
            onDrop={handleImageDrop}
            onClick={() => imageInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
              isDraggingImages
                ? 'border-indigo-400 bg-indigo-950/30'
                : 'border-slate-700 hover:border-slate-500 bg-slate-900/60'
            }`}
          >
            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) processSelectedImageFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-100">
              Drag & Drop Up to 500 Document Images
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Select marksheets, certificates, or scanned degrees directly. JPG, PNG, WEBP, BMP supported.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
                Browse Files
              </span>
              <span className="text-xs text-slate-500">or drop folders/files here</span>
            </div>
          </div>

          {/* Uploaded Images Stats Pill Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Files className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-slate-200">Image Batch Inventory</span>
              </div>
              {images.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add More
                  </button>
                  <span className="text-slate-700">|</span>
                  <button
                    onClick={onClearImages}
                    className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                <div className="text-lg font-bold text-white">{images.length}</div>
                <div className="text-[11px] text-slate-400">Total Selected</div>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                <div className="text-lg font-bold text-emerald-400">{images.length}</div>
                <div className="text-[11px] text-slate-400">Supported Format</div>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                <div className="text-lg font-bold text-indigo-400">{formatBytes(totalSizeBytes)}</div>
                <div className="text-[11px] text-slate-400">Batch Size</div>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                <div className={`text-lg font-bold ${duplicateNameCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {duplicateNameCount}
                </div>
                <div className="text-[11px] text-slate-400">Duplicate Names</div>
              </div>
            </div>

            {/* Unsupported / Skipped Files Banner if any */}
            {unsupportedFiles.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
                <div className="font-semibold flex items-center justify-between">
                  <span>{unsupportedFiles.length} Unsupported file(s) skipped:</span>
                  <button onClick={() => setUnsupportedFiles([])} className="text-slate-400 hover:text-white">
                    Dismiss
                  </button>
                </div>
                <ul className="mt-1 list-disc list-inside space-y-0.5 text-rose-200/80 text-[11px]">
                  {unsupportedFiles.slice(0, 3).map((f, i) => (
                    <li key={i}>
                      {f.name}: {f.reason}
                    </li>
                  ))}
                  {unsupportedFiles.length > 3 && <li>...and {unsupportedFiles.length - 3} more</li>}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Excel Workbook Upload (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingExcel(true);
            }}
            onDragLeave={() => setIsDraggingExcel(false)}
            onDrop={handleExcelDrop}
            onClick={() => excelInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
              isDraggingExcel
                ? 'border-emerald-400 bg-emerald-950/30'
                : 'border-slate-700 hover:border-slate-500 bg-slate-900/60'
            }`}
          >
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) onExcelUpload(e.target.files[0]);
                e.target.value = '';
              }}
            />
            <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-100">Upload Candidate Master Excel</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Upload your spreadsheet (.xlsx or .xls) containing Candidate Name, Check ID, Ref No, or Roll No.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-500 transition-colors">
                Browse Excel File
              </span>
            </div>
          </div>

          {/* Excel Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Excel Workbook Status
                </span>
                {excelFile && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> Loaded
                  </span>
                )}
              </div>

              {excelFile ? (
                <div className="bg-slate-800/70 p-3.5 rounded-lg border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">File Name:</span>
                    <span className="font-semibold text-white truncate max-w-[200px]">{excelFile.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Candidate Records:</span>
                    <span className="font-bold text-emerald-400">{excelRecordCount} rows</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Worksheets:</span>
                    <span className="font-medium text-slate-200">{excelSheetCount} sheets</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Leading Zero Check:</span>
                    <span className="font-medium text-emerald-300">Protected (Raw String Mode)</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/50 text-center text-xs text-slate-400">
                  No Excel workbook loaded yet. Please upload a .xlsx or .xls file.
                </div>
              )}
            </div>

            {/* Next Step Button */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={onProceedToMapping}
                disabled={images.length === 0 || isOverLimit}
                className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {excelFile
                  ? `Continue to Column Mapping & Strategy (${images.length} images, ${excelRecordCount} candidates)`
                  : `Proceed to OCR & Document Text Extraction (${images.length} image${images.length === 1 ? '' : 's'})`}
              </button>
              {!excelFile && images.length > 0 && (
                <p className="text-[11px] text-amber-400/90 text-center mt-2">
                  No Excel workbook loaded: OCR will extract identifiers and propose filenames based on detected IDs. You can also upload an Excel sheet anytime.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Thumbnail Gallery Preview (Lazy-rendered grid with removal action) */}
      {images.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              Uploaded Image Previews ({images.length} files)
            </h3>
            <span className="text-xs text-slate-400">
              Showing thumbnail cache. Hover to inspect or delete.
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {images.slice(0, 120).map((img, idx) => (
              <div
                key={img.id}
                onClick={() => onSelectImageForInspection && onSelectImageForInspection(img)}
                className="group relative bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow hover:border-indigo-400 transition-all flex flex-col cursor-pointer"
                title="Click to inspect document in full quality"
              >
                <div className="relative aspect-[3/4] bg-slate-950 flex items-center justify-center overflow-hidden">
                  <img
                    src={img.originalUrl || img.previewUrl}
                    alt={img.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute top-1 left-1 bg-slate-900/80 text-[10px] font-mono px-1.5 py-0.5 rounded text-slate-300">
                    #{idx + 1}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveImage(img.id);
                    }}
                    title="Remove Image"
                    className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-1.5 bg-slate-800">
                  <div className="text-[11px] font-medium text-slate-200 truncate" title={img.name}>
                    {img.name}
                  </div>
                  <div className="text-[10px] text-slate-400">{formatBytes(img.size)}</div>
                </div>
              </div>
            ))}
          </div>

          {images.length > 120 && (
            <div className="mt-3 text-center text-xs text-slate-400 bg-slate-800/50 py-2 rounded-lg border border-slate-700/60">
              Displaying first 120 thumbnails for memory efficiency. All {images.length} images are safely registered in batch memory.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
