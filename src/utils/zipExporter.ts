import JSZip from 'jszip';
import { ColumnMapping, ExcelRecord, ImageItem } from '../types';
import { generateProcessedExcel } from './excelParser';

/**
 * Trigger browser file download from a Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

/**
 * Helper to generate CSV string from array of objects
 */
function createCsvString(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const csvLines = [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',')];

  for (const row of rows) {
    const line = headers.map((h) => {
      const val = row[h] !== undefined && row[h] !== null ? String(row[h]) : '';
      return `"${val.replace(/"/g, '""')}"`;
    });
    csvLines.push(line.join(','));
  }

  return csvLines.join('\r\n');
}

/**
 * Generate CSV and TXT audit reports
 */
export function generateAuditReports(images: ImageItem[], records: ExcelRecord[], mapping: ColumnMapping) {
  const auditRows = images.map((img, idx) => {
    const matchedRecord = records.find((r) => {
      const matchId = img.manualOverrideRecordId || (img.matchResult && img.matchResult.matchedRecordId);
      return matchId === r.__id;
    });

    const candidateName = matchedRecord && mapping.candidateName ? matchedRecord[mapping.candidateName] : 'Unmatched';
    const rowNum = matchedRecord ? matchedRecord.__rowNum : 'N/A';

    return {
      'Audit Index': idx + 1,
      'Original Filename': img.name,
      'Internal File ID': img.id,
      'Extracted Check ID': img.ocrResult?.extractedIdentifiers.checkId || 'None',
      'Extracted Ref No': img.ocrResult?.extractedIdentifiers.refNo || 'None',
      'Extracted Reg No': img.ocrResult?.extractedIdentifiers.regNo || 'None',
      'Extracted Candidate Name': img.ocrResult?.extractedIdentifiers.candidateName || 'None',
      'Matched Candidate': candidateName,
      'Excel Row': rowNum,
      'Final Assigned Filename': img.finalFilename || img.proposedFilename || img.name,
      'Status': img.status.toUpperCase(),
      'Review Reason / Evidence': img.reviewNotes || img.matchResult?.reason || 'No details',
    };
  });

  const csvContent = createCsvString(auditRows);

  let txtContent = '================================================================================\r\n';
  txtContent += 'DOCUMATCH & RENAME AUTOMATOR - OFFICIAL PROCESSING AUDIT LOG\r\n';
  txtContent += `Generated: ${new Date().toISOString()}\r\n`;
  txtContent += `Total Images Uploaded: ${images.length}\r\n`;
  txtContent += `Total Matched & Approved (DONE): ${images.filter((i) => i.status === 'done').length}\r\n`;
  txtContent += `Total Requiring Review (REVIEW): ${images.filter((i) => i.status === 'review').length}\r\n`;
  txtContent += `Total Unmatched (NOT): ${images.filter((i) => i.status === 'not' || i.status === 'error').length}\r\n`;
  txtContent += '================================================================================\r\n\r\n';

  auditRows.forEach((r) => {
    txtContent += `[#${r['Audit Index']}] [${r['Status']}] ${r['Original Filename']} -> ${r['Final Assigned Filename']}\r\n`;
    txtContent += `  Candidate: ${r['Matched Candidate']} (Excel Row: ${r['Excel Row']})\r\n`;
    txtContent += `  Identifiers: Check ID: ${r['Extracted Check ID']} | Ref: ${r['Extracted Ref No']} | Reg: ${r['Extracted Reg No']}\r\n`;
    txtContent += `  Notes: ${r['Review Reason / Evidence']}\r\n\r\n`;
  });

  return { csvContent, txtContent };
}

/**
 * Deliverable A: Renamed_Matched_Images.zip
 */
export async function exportMatchedImagesZip(
  images: ImageItem[],
  onProgress?: (percent: number, msg: string) => void
): Promise<Blob> {
  const zip = new JSZip();
  const matchedImages = images.filter((img) => img.status === 'done');

  if (matchedImages.length === 0) {
    throw new Error('No images with status DONE are available for matched export. Please review and approve matches first.');
  }

  for (let i = 0; i < matchedImages.length; i++) {
    const img = matchedImages[i];
    const targetName = img.finalFilename || img.proposedFilename || img.name;
    const arrayBuffer = await img.file.arrayBuffer();
    zip.file(targetName, arrayBuffer);

    if (onProgress) {
      onProgress(Math.round(((i + 1) / matchedImages.length) * 80), `Archiving matched: ${targetName}`);
    }
  }

  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (metadata) => {
    if (onProgress) {
      onProgress(80 + Math.round(metadata.percent * 0.2), `Compressing ZIP archive...`);
    }
  });
}

/**
 * Deliverable B: Unmatched_Images.zip
 */
export async function exportUnmatchedImagesZip(
  images: ImageItem[],
  onProgress?: (percent: number, msg: string) => void
): Promise<Blob> {
  const zip = new JSZip();
  const unmatchedImages = images.filter((img) => img.status !== 'done');

  if (unmatchedImages.length === 0) {
    throw new Error('All images were successfully matched! No unresolved documents remain.');
  }

  const unresolvedReportRows = unmatchedImages.map((img) => ({
    'Original Filename': img.name,
    'Internal File ID': img.id,
    'Current Status': img.status.toUpperCase(),
    'Extracted Check ID': img.ocrResult?.extractedIdentifiers.checkId || 'None',
    'Extracted Reference No': img.ocrResult?.extractedIdentifiers.refNo || 'None',
    'Extracted Registration No': img.ocrResult?.extractedIdentifiers.regNo || 'None',
    'Extracted Name': img.ocrResult?.extractedIdentifiers.candidateName || 'None',
    'Unresolved Reason': img.reviewNotes || img.matchResult?.reason || 'No reliable match found in Excel',
  }));

  const csvReport = createCsvString(unresolvedReportRows);
  zip.file('Unresolved_Report.csv', csvReport);

  for (let i = 0; i < unmatchedImages.length; i++) {
    const img = unmatchedImages[i];
    const folder = img.status === 'review' ? 'Review_Required' : 'Unmatched_Not_Found';
    const arrayBuffer = await img.file.arrayBuffer();
    zip.file(`${folder}/${img.name}`, arrayBuffer);

    if (onProgress) {
      onProgress(Math.round(((i + 1) / unmatchedImages.length) * 80), `Archiving unresolved: ${img.name}`);
    }
  }

  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (metadata) => {
    if (onProgress) {
      onProgress(80 + Math.round(metadata.percent * 0.2), `Compressing Unmatched ZIP archive...`);
    }
  });
}

/**
 * Deliverable C: Processed_Excel.xlsx
 */
export function exportProcessedExcelBlob(
  rawWorkbook: any,
  selectedSheet: string,
  records: ExcelRecord[],
  images: ImageItem[],
  mapping: ColumnMapping
): Blob {
  const excelBytes = generateProcessedExcel(rawWorkbook, selectedSheet, records, images, mapping);
  return new Blob([excelBytes.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Deliverable D: Complete_Package.zip
 */
export async function exportCompletePackageZip(
  images: ImageItem[],
  records: ExcelRecord[],
  mapping: ColumnMapping,
  rawWorkbook: any,
  selectedSheet: string,
  onProgress?: (percent: number, msg: string) => void
): Promise<Blob> {
  const zip = new JSZip();

  // Folders
  const matchedFolder = zip.folder('Matched_Images');
  const unmatchedFolder = zip.folder('Unmatched_Images');

  const matchedList = images.filter((i) => i.status === 'done');
  const unmatchedList = images.filter((i) => i.status !== 'done');

  let processedCount = 0;
  const total = images.length;

  // Add matched images
  for (const img of matchedList) {
    const targetName = img.finalFilename || img.proposedFilename || img.name;
    const buf = await img.file.arrayBuffer();
    matchedFolder?.file(targetName, buf);
    processedCount++;
    if (onProgress) {
      onProgress(Math.round((processedCount / total) * 50), `Packing matched: ${targetName}`);
    }
  }

  // Add unmatched images
  for (const img of unmatchedList) {
    const sub = img.status === 'review' ? 'Review_Required/' : 'Unmatched_Not_Found/';
    const buf = await img.file.arrayBuffer();
    unmatchedFolder?.file(`${sub}${img.name}`, buf);
    processedCount++;
    if (onProgress) {
      onProgress(Math.round((processedCount / total) * 50), `Packing unresolved: ${img.name}`);
    }
  }

  // Add Processed_Excel.xlsx
  if (onProgress) onProgress(60, 'Generating Processed_Excel.xlsx...');
  const excelBytes = generateProcessedExcel(rawWorkbook, selectedSheet, records, images, mapping);
  zip.file('Processed_Excel.xlsx', excelBytes);

  // Add Reports
  if (onProgress) onProgress(75, 'Generating Audit reports...');
  const { csvContent, txtContent } = generateAuditReports(images, records, mapping);
  zip.file('Audit_Report.csv', csvContent);
  zip.file('Audit_Report.txt', txtContent);

  // Add README.txt
  const readmeText = `================================================================================
DOCUMATCH & RENAME AUTOMATOR - COMPLETE DELIVERABLE PACKAGE
================================================================================
This archive contains the complete audit and deliverable set:

1. Matched_Images/
   Contains all verified and approved candidate document images renamed to their
   assigned target filenames (Check ID, Reference Number, or Official Filename).

2. Unmatched_Images/
   Contains all unresolved or review-pending document images, retaining their
   original filenames, organized into 'Review_Required' and 'Unmatched_Not_Found'.

3. Processed_Excel.xlsx
   The updated master spreadsheet containing updated candidate statuses, assigned
   filenames, matched original image references, plus a full 'Processing_Audit'
   worksheet and 'Unmatched_Candidates' worksheet.

4. Audit_Report.csv & Audit_Report.txt
   Complete line-by-line verification evidence and audit notes for all documents.

Total Uploaded: ${images.length}
Matched (DONE): ${matchedList.length}
Unresolved: ${unmatchedList.length}
All files processed locally in your browser. Zero cloud transmission.
================================================================================
`;
  zip.file('README.txt', readmeText);

  // Compress
  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (metadata) => {
    if (onProgress) {
      onProgress(80 + Math.round(metadata.percent * 0.2), `Compressing Complete Package...`);
    }
  });
}
