export type ImageStatus = 'pending' | 'processing' | 'done' | 'review' | 'not' | 'error';
export type MatchStatus = 'DONE' | 'REVIEW' | 'NOT';
export type OcrEngineType = 'ensemble' | 'paddleocr' | 'doctr' | 'tesseract';

export interface ExtractedIdentifiers {
  candidateName?: string;
  checkId?: string;
  refNo?: string;
  regNo?: string;
  rollNo?: string;
  appNo?: string;
  university?: string;
  college?: string;
  course?: string;
  examYear?: string;
  documentType?: string;
}

export interface OCRResult {
  rawText: string;
  normalizedText: string;
  confidence: number;
  extractedIdentifiers: ExtractedIdentifiers;
  durationMs: number;
  rotation: number;
  ocrEngine?: OcrEngineType;
}

export interface ExcelRecord {
  __rowNum: number;
  __id: string;
  [key: string]: any;
}

export interface ColumnMapping {
  candidateName: string;
  officialFilename: string;
  checkId: string;
  refNo: string;
  regNo: string;
  rollNo: string;
  appNo: string;
  university: string;
  course: string;
  documentType: string;
}

export type FilenameMethod =
  | 'official'
  | 'checkId'
  | 'refNo'
  | 'regNo'
  | 'rollNo'
  | 'candidateName'
  | 'custom'
  | 'combined';

export interface FilenameStrategy {
  method: FilenameMethod;
  customColumn: string;
  combinedColumns: string[];
  prefix: string;
  suffix: string;
  separator: string;
  handleDuplicates: 'numbered' | 'subfolder';
  casing: 'original' | 'uppercase' | 'lowercase';
}

export interface MatchResult {
  matchedRecordId: string | null;
  matchedRecord: ExcelRecord | null;
  status: MatchStatus;
  confidenceScore: number;
  matchedCriteria: string[];
  conflicts: string[];
  reason: string;
}

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
  originalUrl?: string;
  width?: number;
  height?: number;
  rotation: number; // 0, 90, 180, 270
  contrastBoost?: boolean;
  status: ImageStatus;
  progress?: number;
  ocrResult?: OCRResult;
  matchResult?: MatchResult;
  proposedFilename?: string;
  finalFilename?: string;
  userApproved?: boolean;
  manualOverrideRecordId?: string | null;
  editedIdentifiers?: Partial<ExtractedIdentifiers>;
  reviewNotes?: string;
  collisionIndex?: number;
  errorMessage?: string;
}

export interface ProcessingStats {
  totalImagesUploaded: number;
  totalImagesInventoried: number;
  totalExcelRecords: number;
  totalImagesMatched: number;
  totalImagesRenamed: number;
  totalDone: number;
  totalReview: number;
  totalNot: number;
  totalDuplicateIdentifiers: number;
  totalFilenameConflicts: number;
  totalOcrFailures: number;
  totalExcelRecordsWithoutImages: number;
  totalOutputsGenerated: number;
}

export interface VerificationCheck {
  id: string;
  category: 'Pass 1: Match & Naming' | 'Pass 2: Export & Excel';
  title: string;
  description: string;
  passed: boolean;
  details: string;
}
