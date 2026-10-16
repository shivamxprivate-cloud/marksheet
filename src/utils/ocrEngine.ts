import { createWorker, Worker } from 'tesseract.js';
import { ExtractedIdentifiers, OCRResult, OcrEngineType } from '../types';
import { preprocessImageForOcr } from './imageUtils';

let globalWorker: Worker | null = null;
let isInitializing = false;
let initPromise: Promise<Worker> | null = null;

/**
 * Get or initialize a shared Tesseract worker to maximize reuse across 500 images
 */
export async function getOcrWorker(): Promise<Worker> {
  if (globalWorker) return globalWorker;

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      const worker = await createWorker('eng');
      globalWorker = worker;
      isInitializing = false;
      return worker;
    } catch (err) {
      isInitializing = false;
      initPromise = null;
      console.warn('Tesseract worker initialization issue:', err);
      throw err;
    }
  })();

  return initPromise;
}

/**
 * Terminate worker if user clears session
 */
export async function terminateOcrWorker(): Promise<void> {
  if (globalWorker) {
    try {
      await globalWorker.terminate();
    } catch (e) {
      console.warn('Worker termination caught:', e);
    }
    globalWorker = null;
    initPromise = null;
    isInitializing = false;
  }
}

/**
 * Clean & normalize text for matching
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toUpperCase()
    .replace(/[\r\n]+/g, ' ')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract structured candidate identifiers from OCR raw text using smart regexes
 */
export function extractIdentifiersFromText(rawText: string): ExtractedIdentifiers {
  const identifiers: ExtractedIdentifiers = {};
  if (!rawText) return identifiers;

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const fullText = rawText;

  // 1. Check ID pattern (e.g. CHK1025, CHECK ID: 1025, CHK-9901)
  const checkIdMatch =
    fullText.match(/\b(CHK[-_]?[0-9A-Z]{3,12})\b/i) ||
    fullText.match(/CHECK\s*(?:ID|NO|NUMBER)?[:\s#-]+([A-Z0-9_-]{3,14})/i) ||
    fullText.match(/\bCID[:\s#-]+([A-Z0-9_-]{3,14})/i);
  if (checkIdMatch) {
    identifiers.checkId = checkIdMatch[1].replace(/\s+/g, '').toUpperCase();
  }

  // 2. Reference Number pattern (e.g. REF45091, REF NO: 2026105, REFERENCE: 99182)
  const refMatch =
    fullText.match(/\b(REF[-_]?[0-9A-Z]{3,14})\b/i) ||
    fullText.match(/REF(?:ERENCE)?\s*(?:NO|NUMBER|#)?[:\s.-]+([A-Z0-9_-]{3,16})/i);
  if (refMatch) {
    identifiers.refNo = refMatch[1].replace(/\s+/g, '').toUpperCase();
  }

  // 3. Registration / Enrollment Number (e.g. REG001245, REG NO: 001245, ENR: 88120)
  const regMatch =
    fullText.match(/\b(REG[-_]?[0-9A-Z]{4,14})\b/i) ||
    fullText.match(/(?:REG(?:ISTRATION)?|ENROLLMENT|ENROLMENT)\s*(?:NO|NUMBER)?[:\s.-]+([A-Z0-9_-]{3,16})/i);
  if (regMatch) {
    identifiers.regNo = regMatch[1].replace(/\s+/g, '').toUpperCase();
  }

  // 4. Roll Number (e.g. ROLL55021, ROLL NO: 55021)
  const rollMatch =
    fullText.match(/\b(ROLL[-_]?[0-9A-Z]{4,12})\b/i) ||
    fullText.match(/ROLL\s*(?:NO|NUMBER)?[:\s.-]+([A-Z0-9_-]{3,14})/i);
  if (rollMatch) {
    identifiers.rollNo = rollMatch[1].replace(/\s+/g, '').toUpperCase();
  }

  // 5. Application Number
  const appMatch = fullText.match(/APP(?:LICATION)?\s*(?:NO|ID|NUMBER)?[:\s.-]+([A-Z0-9_-]{3,14})/i);
  if (appMatch) {
    identifiers.appNo = appMatch[1].replace(/\s+/g, '').toUpperCase();
  }

  // 6. Candidate Name Extraction
  // Look for lines following "NAME OF CANDIDATE", "CANDIDATE NAME", "STUDENT NAME", "NAME:"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nameLabelMatch = line.match(/(?:CANDIDATE(?:\s*')?S?\s*NAME|STUDENT(?:\s*')?S?\s*NAME|NAME\s*OF\s*CANDIDATE|NAME\s*OF\s*STUDENT|APPLICANT\s*NAME|CANDIDATE\s*NAME)\s*[:.-]?\s*(.*)/i);
    if (nameLabelMatch) {
      let candidatePortion = nameLabelMatch[1].trim();
      if (!candidatePortion && i + 1 < lines.length) {
        candidatePortion = lines[i + 1].trim();
      }
      candidatePortion = candidatePortion.replace(/[^a-zA-Z\s]/g, '').trim();
      if (candidatePortion.length >= 3) {
        identifiers.candidateName = candidatePortion.toUpperCase();
        break;
      }
    }
  }

  // Loose name extraction if not yet found
  if (!identifiers.candidateName) {
    const looseMatch = fullText.match(/\bNAME\s*[:.-]\s*([A-Za-z\s]{3,35})\b/i);
    if (looseMatch) {
      identifiers.candidateName = looseMatch[1].replace(/[^a-zA-Z\s]/g, '').trim().toUpperCase();
    }
  }

  // 7. University / Board detection
  const univMatch =
    fullText.match(/([A-Za-z\s]+(?:UNIVERSITY|BOARD\s*OF|INSTITUTE\s*OF\s*TECHNOLOGY|ACADEMY))/i) ||
    fullText.match(/(DELHI\s*TECHNOLOGICAL\s*UNIVERSITY|ANNA\s*UNIVERSITY|MUMBAI\s*UNIVERSITY|MAHARASHTRA\s*BOARD)/i);
  if (univMatch) {
    identifiers.university = univMatch[1].trim().toUpperCase();
  }

  // 8. Document Type
  if (/MARKSHEET|STATEMENT\s*OF\s*MARKS/i.test(fullText)) {
    identifiers.documentType = 'Marksheet';
  } else if (/PROVISIONAL\s*CERTIFICATE/i.test(fullText)) {
    identifiers.documentType = 'Provisional Certificate';
  } else if (/DEGREE\s*CERTIFICATE|BACHELOR|MASTER/i.test(fullText)) {
    identifiers.documentType = 'Degree Certificate';
  } else if (/TRANSCRIPT/i.test(fullText)) {
    identifiers.documentType = 'Transcript';
  } else if (/IDENTITY\s*CARD|ID\s*CARD/i.test(fullText)) {
    identifiers.documentType = 'ID Card';
  }

  // 9. Exam Year (e.g. 2021, 2022, 2023, 2024, 2025, 2026)
  const yearMatch = fullText.match(/\b(20[12][0-9])\b/);
  if (yearMatch) {
    identifiers.examYear = yearMatch[1];
  }

  return identifiers;
}

/**
 * Server OCR using specialized engines (PaddleOCR, DocTR, Tesseract, or Ensemble)
 */
export async function performServerOcr(
  file: File,
  engine: OcrEngineType = 'ensemble'
): Promise<{ rawText: string; confidence: number; extractedIdentifiers: ExtractedIdentifiers; engineUsed: string }> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const res = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType: file.type || 'image/jpeg',
      filename: file.name,
      engine,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server OCR endpoint status ${res.status}`);
  }

  const data = await res.json();
  return {
    rawText: data.rawText || '',
    confidence: data.confidence || 96,
    extractedIdentifiers: data.extractedIdentifiers || {},
    engineUsed: data.engineUsed || engine,
  };
}

/**
 * Execute OCR on an image file with selectable OCR engines:
 * - 'ensemble': Cross-validates PaddleOCR + DocTR + Tesseract for maximum accuracy
 * - 'paddleocr': Ultra-resilient layout, table, and multi-angle orientation detection
 * - 'doctr': Deep transformer document field & line structure recognition
 * - 'tesseract': Standard LSTM character segmentation
 */
export async function performOcrOnImage(
  file: File,
  rotation: number = 0,
  boostContrast: boolean = false,
  engine: OcrEngineType = 'ensemble'
): Promise<OCRResult> {
  const startTime = performance.now();

  let rawText = '';
  let confidence = 0;
  let serverIdentifiers: ExtractedIdentifiers = {};
  let effectiveEngine = engine;

  // When user selects PaddleOCR, DocTR, or Ensemble, run directly with that specialized engine
  if (engine === 'paddleocr' || engine === 'doctr' || engine === 'ensemble') {
    try {
      const serverResult = await performServerOcr(file, engine);
      rawText = serverResult.rawText;
      confidence = serverResult.confidence;
      serverIdentifiers = serverResult.extractedIdentifiers;
      effectiveEngine = (serverResult.engineUsed as OcrEngineType) || engine;
    } catch (err: any) {
      console.warn(`Engine ${engine} returned error, trying fallback:`, err);
      try {
        const preprocessed = await preprocessImageForOcr(file, rotation, boostContrast);
        const worker = await getOcrWorker();
        const ret = await worker.recognize(preprocessed);
        rawText = ret.data.text || '';
        confidence = Math.round(ret.data.confidence || 0);
        effectiveEngine = 'tesseract';
      } catch (locErr: any) {
        throw new Error(`Failed to extract text with ${engine}: ${err?.message || locErr?.message}`);
      }
    }
  } else {
    // Engine is tesseract
    try {
      const preprocessed = await preprocessImageForOcr(file, rotation, boostContrast);
      const worker = await getOcrWorker();
      const ret = await worker.recognize(preprocessed);
      rawText = ret.data.text || '';
      confidence = Math.round(ret.data.confidence || 0);
      effectiveEngine = 'tesseract';
    } catch (err: any) {
      console.warn('Local Tesseract worker blocked or failed; delegating to server Tesseract engine:', err);
      const serverResult = await performServerOcr(file, 'tesseract');
      rawText = serverResult.rawText;
      confidence = serverResult.confidence;
      serverIdentifiers = serverResult.extractedIdentifiers;
      effectiveEngine = 'tesseract';
    }
  }

  const durationMs = Math.round(performance.now() - startTime);
  const normalizedText = normalizeText(rawText);
  const localIdentifiers = extractIdentifiersFromText(rawText);

  const extractedIdentifiers: ExtractedIdentifiers = {
    ...localIdentifiers,
    ...serverIdentifiers,
  };

  return {
    rawText,
    normalizedText,
    confidence,
    extractedIdentifiers,
    durationMs,
    rotation,
    ocrEngine: effectiveEngine,
  };
}
