import * as XLSX from 'xlsx';
import { ColumnMapping, ExcelRecord, ImageItem } from '../types';

export interface ParsedWorkbook {
  sheetNames: string[];
  selectedSheet: string;
  headers: string[];
  records: ExcelRecord[];
  rawWorkbook: XLSX.WorkBook;
}

/**
 * Parse an Excel file (.xlsx, .xls) and preserve leading zeros and formatting
 */
export async function parseExcelFile(file: File): Promise<ParsedWorkbook> {
  const arrayBuffer = await file.arrayBuffer();
  // cellText: true, raw: false ensures SheetJS reads the formatted cell display string (cell.w),
  // which preserves leading zeroes (e.g. "001245")
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    raw: false,
    cellText: true,
    cellDates: true,
  });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded Excel file contains no worksheets.');
  }

  const selectedSheet = workbook.SheetNames[0];
  const { headers, records } = parseWorksheet(workbook, selectedSheet);

  return {
    sheetNames: workbook.SheetNames,
    selectedSheet,
    headers,
    records,
    rawWorkbook: workbook,
  };
}

/**
 * Parse a specific worksheet from the workbook
 */
export function parseWorksheet(workbook: XLSX.WorkBook, sheetName: string): { headers: string[]; records: ExcelRecord[] } {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    return { headers: [], records: [] };
  }

  // Read as array of rows with raw cell strings
  const sheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: '',
  });

  if (!sheetData || sheetData.length === 0) {
    return { headers: [], records: [] };
  }

  // Identify header row (first non-empty row)
  let headerRowIndex = 0;
  while (headerRowIndex < sheetData.length && (!sheetData[headerRowIndex] || sheetData[headerRowIndex].length === 0)) {
    headerRowIndex++;
  }

  if (headerRowIndex >= sheetData.length) {
    return { headers: [], records: [] };
  }

  const rawHeaders = sheetData[headerRowIndex] || [];
  const headers = rawHeaders.map((h, i) => (h !== undefined && h !== null && String(h).trim() ? String(h).trim() : `Column_${i + 1}`));

  const records: ExcelRecord[] = [];

  for (let r = headerRowIndex + 1; r < sheetData.length; r++) {
    const row = sheetData[r];
    if (!row || row.every((c: any) => c === '' || c === null || c === undefined)) {
      continue; // Skip entirely empty rows
    }

    const record: ExcelRecord = {
      __rowNum: r + 1, // 1-indexed Excel row
      __id: `row_${r + 1}`,
    };

    headers.forEach((header, colIdx) => {
      const val = row[colIdx];
      // Keep string value trimmed, preserving exact characters and leading zeros
      record[header] = val !== undefined && val !== null ? String(val).trim() : '';
    });

    records.push(record);
  }

  return { headers, records };
}

/**
 * Intelligent automatic column detection
 */
export function autoDetectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    candidateName: '',
    officialFilename: '',
    checkId: '',
    refNo: '',
    regNo: '',
    rollNo: '',
    appNo: '',
    university: '',
    course: '',
    documentType: '',
  };

  const patterns: { key: keyof ColumnMapping; regex: RegExp }[] = [
    { key: 'candidateName', regex: /^(candidate\s*name|student\s*name|applicant\s*name|full\s*name|name)$/i },
    { key: 'officialFilename', regex: /(official\s*file|file\s*name|filename|target\s*file|image\s*name)/i },
    { key: 'checkId', regex: /^(check\s*id|checkid|chk\s*id|check_id|cid|verification\s*id)$/i },
    { key: 'refNo', regex: /(ref\s*no|ref\s*number|reference\s*no|reference\s*number|ref_no|ref_num)/i },
    { key: 'regNo', regex: /(reg\s*no|reg\s*number|registration\s*no|registration\s*number|enrollment\s*no|enrollment\s*number|enrolment\s*no|reg_no)/i },
    { key: 'rollNo', regex: /(roll\s*no|roll\s*number|seat\s*no|hall\s*ticket)/i },
    { key: 'appNo', regex: /(app\s*no|application\s*no|application\s*number|app_id)/i },
    { key: 'university', regex: /(univ|university|board|institute|college|institution)/i },
    { key: 'course', regex: /(course|degree|program|branch|stream)/i },
    { key: 'documentType', regex: /(doc\s*type|document\s*type|certificate\s*type)/i },
  ];

  for (const { key, regex } of patterns) {
    const match = headers.find((h) => regex.test(h));
    if (match) {
      mapping[key] = match;
    }
  }

  // Secondary looser pass if candidate name wasn't found
  if (!mapping.candidateName) {
    const looseName = headers.find((h) => /name/i.test(h) && !/file/i.test(h) && !/board/i.test(h));
    if (looseName) mapping.candidateName = looseName;
  }

  return mapping;
}

/**
 * Generate Processed_Excel.xlsx workbook with updated candidate status and audit trail
 */
export function generateProcessedExcel(
  rawWorkbook: XLSX.WorkBook,
  activeSheetName: string,
  records: ExcelRecord[],
  images: ImageItem[],
  columnMapping: ColumnMapping
): Uint8Array {
  // Clone or copy workbook
  const wb = XLSX.utils.book_new();

  // 1. Process Active Candidate Sheet
  const processedRecords = records.map((rec) => {
    // Find all images matched to this record
    const matchedImages = images.filter((img) => {
      const matchId = img.manualOverrideRecordId || (img.matchResult && img.matchResult.matchedRecordId);
      return matchId === rec.__id;
    });

    let processingStatus = 'PENDING';
    if (matchedImages.length > 0) {
      const allDone = matchedImages.every((img) => img.status === 'done');
      const anyReview = matchedImages.some((img) => img.status === 'review');
      if (allDone) {
        processingStatus = 'DONE';
      } else if (anyReview) {
        processingStatus = 'REVIEW';
      } else {
        processingStatus = 'REVIEW';
      }
    } else {
      processingStatus = 'NOT_MATCHED';
    }

    const matchedOriginalFilenames = matchedImages.map((img) => img.name).join('; ');
    const assignedFilenames = matchedImages.map((img) => img.finalFilename || img.proposedFilename || '').filter(Boolean).join('; ');
    const extractedCheckIds = matchedImages.map((img) => img.ocrResult?.extractedIdentifiers.checkId || '').filter(Boolean).join('; ');
    const extractedRefNos = matchedImages.map((img) => img.ocrResult?.extractedIdentifiers.refNo || '').filter(Boolean).join('; ');
    const extractedRegNos = matchedImages.map((img) => img.ocrResult?.extractedIdentifiers.regNo || '').filter(Boolean).join('; ');
    const extractedNames = matchedImages.map((img) => img.ocrResult?.extractedIdentifiers.candidateName || '').filter(Boolean).join('; ');
    const matchConfidences = matchedImages.map((img) => (img.matchResult ? `${img.matchResult.confidenceScore}%` : '')).filter(Boolean).join('; ');
    const notes = matchedImages.map((img) => img.reviewNotes || img.matchResult?.reason || '').filter(Boolean).join('; ');

    const newObj: Record<string, any> = {};
    // Copy original columns (excluding internal __rowNum, __id)
    Object.keys(rec).forEach((k) => {
      if (!k.startsWith('__')) {
        newObj[k] = rec[k];
      }
    });

    // Append our verified automated processing columns
    newObj['Processing Status'] = processingStatus;
    newObj['Matched Original Image'] = matchedOriginalFilenames || 'None';
    newObj['Assigned Filename'] = assignedFilenames || 'N/A';
    newObj['Filename Identifier Type'] = columnMapping.checkId ? 'Check ID' : columnMapping.refNo ? 'Ref No' : 'Official/Custom';
    newObj['Extracted Check ID'] = extractedCheckIds || '-';
    newObj['Extracted Reference Number'] = extractedRefNos || '-';
    newObj['Extracted Registration Number'] = extractedRegNos || '-';
    newObj['Extracted Candidate Name'] = extractedNames || '-';
    newObj['Match Confidence'] = matchConfidences || '-';
    newObj['Review Notes'] = notes || (matchedImages.length === 0 ? 'No matching document image uploaded in batch' : 'Match verified');

    return newObj;
  });

  const mainWs = XLSX.utils.json_to_sheet(processedRecords);
  XLSX.utils.book_append_sheet(wb, mainWs, activeSheetName || 'Candidates_Processed');

  // 2. Add Processing_Audit sheet (one row per uploaded image)
  const auditRows = images.map((img, idx) => {
    const matchedRecord = records.find((r) => {
      const matchId = img.manualOverrideRecordId || (img.matchResult && img.matchResult.matchedRecordId);
      return matchId === r.__id;
    });

    const candidateName = matchedRecord && columnMapping.candidateName ? matchedRecord[columnMapping.candidateName] : 'Unmatched';
    const rowNum = matchedRecord ? matchedRecord.__rowNum : 'N/A';

    return {
      'Audit Index': idx + 1,
      'Original File Name': img.name,
      'Internal File ID': img.id,
      'File Size': `${(img.size / 1024).toFixed(1)} KB`,
      'Extracted Check ID': img.ocrResult?.extractedIdentifiers.checkId || '-',
      'Extracted Ref No': img.ocrResult?.extractedIdentifiers.refNo || '-',
      'Extracted Reg No': img.ocrResult?.extractedIdentifiers.regNo || '-',
      'Extracted Roll No': img.ocrResult?.extractedIdentifiers.rollNo || '-',
      'Extracted Candidate Name': img.ocrResult?.extractedIdentifiers.candidateName || '-',
      'Matched Candidate': candidateName,
      'Excel Row Number': rowNum,
      'Matching Evidence': img.matchResult?.matchedCriteria.join(' | ') || 'No matching criteria found',
      'Conflicting Evidence': img.matchResult?.conflicts.join(' | ') || 'None',
      'Proposed Filename': img.proposedFilename || 'N/A',
      'Final Assigned Filename': img.finalFilename || img.proposedFilename || 'N/A',
      'Processing Status': img.status === 'done' ? 'DONE' : img.status === 'review' ? 'REVIEW' : 'NOT',
      'User Approved': img.userApproved ? 'Yes' : 'No',
      'Review Notes': img.reviewNotes || img.matchResult?.reason || 'Awaiting review',
      'OCR Duration (ms)': img.ocrResult?.durationMs || 0,
      'OCR Confidence': img.ocrResult ? `${img.ocrResult.confidence}%` : 'N/A',
    };
  });

  const auditWs = XLSX.utils.json_to_sheet(auditRows);
  XLSX.utils.book_append_sheet(wb, auditWs, 'Processing_Audit');

  // 3. Add Unmatched Candidates sheet (Excel records with no image)
  const unmatchedCandidateRecords = records
    .filter((rec) => {
      const hasMatch = images.some((img) => {
        const matchId = img.manualOverrideRecordId || (img.matchResult && img.matchResult.matchedRecordId);
        return matchId === rec.__id;
      });
      return !hasMatch;
    })
    .map((rec) => {
      const cleanObj: Record<string, any> = {};
      Object.keys(rec).forEach((k) => {
        if (!k.startsWith('__')) {
          cleanObj[k] = rec[k];
        }
      });
      cleanObj['Audit Note'] = 'No document image matched in uploaded batch';
      return cleanObj;
    });

  if (unmatchedCandidateRecords.length > 0) {
    const unmatchedWs = XLSX.utils.json_to_sheet(unmatchedCandidateRecords);
    XLSX.utils.book_append_sheet(wb, unmatchedWs, 'Unmatched_Candidates');
  }

  // Preserve other sheets from rawWorkbook if any
  if (rawWorkbook && rawWorkbook.SheetNames) {
    for (const name of rawWorkbook.SheetNames) {
      if (name !== activeSheetName && !wb.SheetNames.includes(name)) {
        try {
          const sheetClone = rawWorkbook.Sheets[name];
          if (sheetClone) {
            XLSX.utils.book_append_sheet(wb, sheetClone, name);
          }
        } catch {
          // Ignore non-critical sheet copy issue
        }
      }
    }
  }

  // Write as binary array
  const outBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(outBuffer);
}
