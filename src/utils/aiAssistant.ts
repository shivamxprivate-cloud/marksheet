import { ColumnMapping, ExcelRecord, ExtractedIdentifiers, ImageItem } from '../types';

export interface AIAnalysisResult {
  candidateName?: string;
  checkId?: string;
  refNo?: string;
  regNo?: string;
  rollNo?: string;
  institution?: string;
  documentType?: string;
  matchedCandidateId?: string | null;
  matchedCandidateRow?: number | null;
  status: 'DONE' | 'REVIEW' | 'NOT';
  confidence: number;
  reasoning: string;
  evidence: string[];
}

export interface AIBatchResolution {
  itemId: string;
  matchedCandidateId: string | null;
  status: 'DONE' | 'REVIEW' | 'NOT';
  confidence: number;
  reasoning: string;
  correctedName?: string | null;
  correctedCheckId?: string | null;
}

/**
 * Check if the Gemini AI backend is available and configured
 */
export async function checkAIStatus(): Promise<{ available: boolean; hasKey: boolean; model?: string }> {
  try {
    const res = await fetch('/api/ai/status');
    if (!res.ok) return { available: false, hasKey: false };
    const data = await res.json();
    return { available: true, hasKey: Boolean(data.hasKey), model: data.model };
  } catch {
    return { available: false, hasKey: false };
  }
}

/**
 * Convert a File object to a base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Perform Multimodal AI Inspection on a document using server-side Gemini 3.8 Flash
 */
export async function analyzeDocumentWithAI(
  image: ImageItem,
  candidates: ExcelRecord[],
  mapping: ColumnMapping
): Promise<AIAnalysisResult> {
  const base64 = await fileToBase64(image.file);

  const res = await fetch('/api/ai/analyze-document', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType: image.file.type || 'image/jpeg',
      filename: image.name,
      candidates,
      mapping,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `AI analysis failed with status ${res.status}`);
  }

  const data = await res.json();
  return data.analysis;
}

/**
 * Batch resolve ambiguous documents using Gemini AI
 */
export async function batchResolveWithAI(
  items: ImageItem[],
  candidates: ExcelRecord[],
  mapping: ColumnMapping
): Promise<AIBatchResolution[]> {
  const payloadItems = items.map((img) => ({
    itemId: img.id,
    filename: img.name,
    ocrIdentifiers: img.ocrResult?.extractedIdentifiers || {},
    ocrConfidence: img.ocrResult?.confidence || 0,
    currentStatus: img.status,
    currentReason: img.reviewNotes || img.matchResult?.reason,
    conflicts: img.matchResult?.conflicts || [],
  }));

  const res = await fetch('/api/ai/batch-resolve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: payloadItems,
      candidates,
      mapping,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `AI batch resolution failed with status ${res.status}`);
  }

  const data = await res.json();
  return data.resolutions;
}
