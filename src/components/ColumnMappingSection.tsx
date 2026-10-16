import React from 'react';
import { Columns, ArrowLeft, ArrowRight, Settings2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { ColumnMapping, FilenameMethod, FilenameStrategy, ExcelRecord } from '../types';

interface ColumnMappingSectionProps {
  sheetNames: string[];
  selectedSheet: string;
  onSelectSheet: (sheetName: string) => void;
  headers: string[];
  columnMapping: ColumnMapping;
  onUpdateColumnMapping: (mapping: ColumnMapping) => void;
  filenameStrategy: FilenameStrategy;
  onUpdateFilenameStrategy: (strategy: FilenameStrategy) => void;
  sampleRecord: ExcelRecord | null;
  onProceedToProcessing: () => void;
  onBackToUpload: () => void;
}

export const ColumnMappingSection: React.FC<ColumnMappingSectionProps> = ({
  sheetNames,
  selectedSheet,
  onSelectSheet,
  headers,
  columnMapping,
  onUpdateColumnMapping,
  filenameStrategy,
  onUpdateFilenameStrategy,
  sampleRecord,
  onProceedToProcessing,
  onBackToUpload,
}) => {
  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    onUpdateColumnMapping({
      ...columnMapping,
      [field]: value,
    });
  };

  const handleStrategyChange = <K extends keyof FilenameStrategy>(key: K, value: FilenameStrategy[K]) => {
    onUpdateFilenameStrategy({
      ...filenameStrategy,
      [key]: value,
    });
  };

  // Preview generated filename on the sample candidate
  const computeSampleFilename = (): string => {
    if (!sampleRecord) return 'Candidate_001.jpg';
    let base = '';
    switch (filenameStrategy.method) {
      case 'official':
        base = (columnMapping.officialFilename && sampleRecord[columnMapping.officialFilename]) || 'Candidate_Official';
        break;
      case 'checkId':
        base = (columnMapping.checkId && sampleRecord[columnMapping.checkId]) || 'CHK1025';
        break;
      case 'refNo':
        base = (columnMapping.refNo && sampleRecord[columnMapping.refNo]) || 'REF45091';
        break;
      case 'regNo':
        base = (columnMapping.regNo && sampleRecord[columnMapping.regNo]) || 'REG001245';
        break;
      case 'rollNo':
        base = (columnMapping.rollNo && sampleRecord[columnMapping.rollNo]) || 'ROLL55021';
        break;
      case 'candidateName':
        base = (columnMapping.candidateName && sampleRecord[columnMapping.candidateName]?.replace(/\s+/g, '_')) || 'HARISH_CHANDRA';
        break;
      case 'custom':
        base = (filenameStrategy.customColumn && sampleRecord[filenameStrategy.customColumn]) || 'Custom_ID';
        break;
      case 'combined':
        const parts = filenameStrategy.combinedColumns.map((col) => sampleRecord[col] || col);
        base = parts.join(filenameStrategy.separator || '_') || 'CHK1025_REF45091';
        break;
    }

    if (filenameStrategy.casing === 'uppercase') base = base.toUpperCase();
    if (filenameStrategy.casing === 'lowercase') base = base.toLowerCase();

    const withPrefixSuffix = `${filenameStrategy.prefix || ''}${base}${filenameStrategy.suffix || ''}`;
    const clean = withPrefixSuffix.replace(/[/\\:*?"<>|\s]/g, '_');
    return clean.endsWith('.jpg') ? clean : `${clean}.jpg`;
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Columns className="w-5 h-5 text-indigo-400" />
              Step 2: Excel Column Mapping & Smart Filename Strategy
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Verify column roles from your spreadsheet and configure the exact automated renaming formula.
            </p>
          </div>

          {/* Worksheet selector */}
          {sheetNames.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-300 font-medium">Worksheet:</span>
              <select
                value={selectedSheet}
                onChange={(e) => onSelectSheet(e.target.value)}
                className="bg-slate-900 text-white text-xs rounded border border-slate-700 px-2.5 py-1 focus:ring-1 focus:ring-indigo-500"
              >
                {sheetNames.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Column Mapping (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-cyan-400" />
                Candidate Record Column Mapping
              </h3>
              <p className="text-xs text-slate-400">Match spreadsheet columns with their verification functions</p>
            </div>
            <span className="text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 font-medium">
              Auto-detected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Candidate Name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Candidate Name Column <span className="text-rose-400">*</span>
              </label>
              <select
                value={columnMapping.candidateName}
                onChange={(e) => handleMappingChange('candidateName', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Not in Excel --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Official Filename */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Official File Name Column
              </label>
              <select
                value={columnMapping.officialFilename}
                onChange={(e) => handleMappingChange('officialFilename', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- None / Use ID Method --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Check ID */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Check ID Column (Priority 1)
              </label>
              <select
                value={columnMapping.checkId}
                onChange={(e) => handleMappingChange('checkId', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Not Assigned --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Ref No */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Reference Number Column (Priority 2)
              </label>
              <select
                value={columnMapping.refNo}
                onChange={(e) => handleMappingChange('refNo', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Not Assigned --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Registration No */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Registration / Enrollment No. (Priority 3)
              </label>
              <select
                value={columnMapping.regNo}
                onChange={(e) => handleMappingChange('regNo', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Not Assigned --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Roll No */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Roll Number Column (Priority 4)
              </label>
              <select
                value={columnMapping.rollNo}
                onChange={(e) => handleMappingChange('rollNo', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Not Assigned --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* University */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                University / Institution Column
              </label>
              <select
                value={columnMapping.university}
                onChange={(e) => handleMappingChange('university', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- None --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Course / Program */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Course / Program Column
              </label>
              <select
                value={columnMapping.course}
                onChange={(e) => handleMappingChange('course', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- None --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Leading Zero Protection Active:</strong> String formatting is locked for identifiers like{' '}
              <code className="bg-slate-900 px-1 py-0.5 rounded text-emerald-300">001245</code> so they are never converted to integer <code className="bg-slate-900 px-1 py-0.5 rounded text-rose-300">1245</code>.
            </span>
          </div>
        </div>

        {/* Right Column: Filename Generation Method (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Filename Generation Method
              </h3>
              <p className="text-xs text-slate-400">Choose how verified files will be renamed upon export</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Naming Strategy
              </label>
              <select
                value={filenameStrategy.method}
                onChange={(e) => handleStrategyChange('method', e.target.value as FilenameMethod)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 text-xs font-medium focus:ring-1 focus:ring-indigo-500"
              >
                <option value="checkId">Option B: Check ID (e.g., CHK1025.jpg)</option>
                <option value="refNo">Option C: Reference Number (e.g., REF2026105.jpg)</option>
                <option value="regNo">Option D: Registration Number (e.g., REG001245.jpg)</option>
                <option value="rollNo">Option E: Roll Number (e.g., ROLL55021.jpg)</option>
                <option value="official">Option A: Official Filename (from Excel)</option>
                <option value="candidateName">Option F: Candidate Name (e.g., HARISH_CHANDRA.jpg)</option>
                <option value="custom">Option G: Custom Column Identifier</option>
                <option value="combined">Option H: Combined Identifiers</option>
              </select>
            </div>

            {/* Custom Column selection */}
            {filenameStrategy.method === 'custom' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Select Custom Column for Filename
                </label>
                <select
                  value={filenameStrategy.customColumn}
                  onChange={(e) => handleStrategyChange('customColumn', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 text-xs"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Combined Columns selection */}
            {filenameStrategy.method === 'combined' && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">
                  Select Columns to Combine
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-800/80 rounded-lg border border-slate-700">
                  {headers.map((h) => {
                    const isChecked = filenameStrategy.combinedColumns.includes(h);
                    return (
                      <label key={h} className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newCols = e.target.checked
                              ? [...filenameStrategy.combinedColumns, h]
                              : filenameStrategy.combinedColumns.filter((c) => c !== h);
                            handleStrategyChange('combinedColumns', newCols);
                          }}
                          className="rounded text-indigo-500"
                        />
                        <span className="truncate">{h}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Prefix & Suffix */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Prefix (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. DOC_"
                  value={filenameStrategy.prefix}
                  onChange={(e) => handleStrategyChange('prefix', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Suffix (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. _VERIFIED"
                  value={filenameStrategy.suffix}
                  onChange={(e) => handleStrategyChange('suffix', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 text-xs"
                />
              </div>
            </div>

            {/* Collision Resolution preview */}
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/80">
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Collision Safe Suffix Policy:</div>
              <div className="text-xs text-slate-300 font-mono">
                Candidate's 1st doc: <span className="text-emerald-400">{computeSampleFilename()}</span>
                <br />
                Candidate's 2nd doc:{' '}
                <span className="text-indigo-400">
                  {computeSampleFilename().replace('.jpg', ' (01).jpg')}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              onClick={onBackToUpload}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <button
              onClick={onProceedToProcessing}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md flex items-center gap-1.5 transition-all"
            >
              <span>Execute OCR & Matching Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
