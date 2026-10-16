import * as XLSX from 'xlsx';
import { ColumnMapping, FilenameStrategy } from '../types';

export interface SampleCandidate {
  candidateName: string;
  checkId: string;
  refNo: string;
  regNo: string;
  rollNo: string;
  officialFilename: string;
  university: string;
  course: string;
  testNote: string;
}

export const SAMPLE_CANDIDATES: SampleCandidate[] = [
  {
    candidateName: 'HARISH CHANDRA',
    checkId: 'CHK1025',
    refNo: 'REF45091',
    regNo: 'REG001245', // Leading zeroes!
    rollNo: 'ROLL55021',
    officialFilename: 'Candidate_1045.jpg',
    university: 'DELHI TECHNOLOGICAL UNIVERSITY',
    course: 'B.TECH COMPUTER ENGINEERING',
    testNote: 'Scenario 1: Exact Check ID match and Sem 1 marksheet',
  },
  {
    candidateName: 'HARISH CHANDRA',
    checkId: 'CHK1025',
    refNo: 'REF45091',
    regNo: 'REG001245',
    rollNo: 'ROLL55021',
    officialFilename: 'Candidate_1045_Sem2.jpg',
    university: 'DELHI TECHNOLOGICAL UNIVERSITY',
    course: 'B.TECH COMPUTER ENGINEERING',
    testNote: 'Scenario 11: Multiple images for same candidate (Sem 2 marksheet) -> collision test',
  },
  {
    candidateName: 'ANITA SHARMA',
    checkId: 'CHK2040',
    refNo: 'REF77102',
    regNo: 'REG008891',
    rollNo: 'ROLL66100',
    officialFilename: 'Anita_Doc_Verified.jpg',
    university: 'MAHARASHTRA BOARD OF TECHNICAL EDUCATION',
    course: 'DIPLOMA IN INFORMATION TECHNOLOGY',
    testNote: 'Scenario 2: Exact Reference Number match',
  },
  {
    candidateName: 'PRIYA NAIR',
    checkId: 'CHK3100',
    refNo: 'REF88219',
    regNo: 'REG003410',
    rollNo: 'ROLL77012',
    officialFilename: 'Priya_Nair_Degree.jpg',
    university: 'ANNA UNIVERSITY CHENNAI',
    course: 'B.E. ELECTRONICS AND COMMUNICATION',
    testNote: 'Scenario 3: Registration number match with leading zeros preserved',
  },
  {
    candidateName: 'VIKRAM SINGH',
    checkId: 'CHK4005',
    refNo: 'REF99014',
    regNo: 'REG004555',
    rollNo: 'ROLL88190',
    officialFilename: 'VIKRAM_SINGH_OFFICIAL.jpg',
    university: 'KARNATAKA STATE OPEN UNIVERSITY',
    course: 'BACHELOR OF COMMERCE',
    testNote: 'Scenario 4: Official filename match',
  },
  {
    candidateName: 'MOHAMMAD FARHAN',
    checkId: '', // Scenario 8: Missing Check ID in Excel
    refNo: 'REF33120',
    regNo: 'REG005612',
    rollNo: 'ROLL99110',
    officialFilename: 'Mohammad_Farhan.jpg',
    university: 'MUMBAI UNIVERSITY',
    course: 'B.SC INFORMATION TECHNOLOGY',
    testNote: 'Scenario 5 & 8: Name spelling variance (MUHAMMAD on doc) & missing Check ID',
  },
  {
    candidateName: 'RAJESH KUMAR',
    checkId: 'CHK5010',
    refNo: '', // Scenario 9: Missing reference number
    regNo: 'REG006789',
    rollNo: 'ROLL11022',
    officialFilename: 'Rajesh_Kumar_Doc.jpg',
    university: 'PUNJAB TECHNICAL UNIVERSITY',
    course: 'BACHELOR OF BUSINESS ADMINISTRATION',
    testNote: 'Scenario 6: Similar name candidate A',
  },
  {
    candidateName: 'RAJESH KUMAR SHARMA',
    checkId: 'CHK5011',
    refNo: 'REF66219',
    regNo: 'REG007999',
    rollNo: 'ROLL22033',
    officialFilename: 'Rajesh_K_Sharma.jpg',
    university: 'PUNJAB TECHNICAL UNIVERSITY',
    course: 'BACHELOR OF COMMERCE',
    testNote: 'Scenario 6: Similar name candidate B',
  },
  {
    candidateName: 'SNEHA PATEL',
    checkId: 'CHK6120',
    refNo: 'REF11902',
    regNo: 'REG008888',
    rollNo: 'ROLL33044',
    officialFilename: 'Sneha_Patel.jpg',
    university: 'GUJARAT UNIVERSITY',
    course: 'M.SC COMPUTER SCIENCE',
    testNote: 'Scenario 7: Conflicting registration number on doc (doc has REG009999 instead)',
  },
  {
    candidateName: 'ARJUN REDDY',
    checkId: 'CHK7230',
    refNo: 'REF22801',
    regNo: 'REG009123',
    rollNo: 'ROLL44055',
    officialFilename: 'Arjun_Reddy_Marksheet.jpg',
    university: 'OSMANIA UNIVERSITY HYDERABAD',
    course: 'B.TECH MECHANICAL ENGINEERING',
    testNote: 'Standard exact match',
  },
];

/**
 * Draw a realistic academic marksheet / certificate onto a canvas and return a File
 */
export async function generateSyntheticMarksheetImage(candidate: SampleCandidate, index: number): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d')!;

  // 1. Parchment paper background with slight gradient
  const grad = ctx.createLinearGradient(0, 0, 1000, 1350);
  grad.addColorStop(0, '#fefdfa');
  grad.addColorStop(0.5, '#fbf8ee');
  grad.addColorStop(1, '#f7f2e2');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1000, 1350);

  // 2. Ornamental ornate border
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#1e3a5f';
  ctx.strokeRect(30, 30, 940, 1290);

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#854d0e';
  ctx.strokeRect(42, 42, 916, 1266);

  // 3. Header institution banner
  ctx.fillStyle = '#1e3a5f';
  ctx.textAlign = 'center';
  ctx.font = 'bold 30px serif';
  ctx.fillText(candidate.university, 500, 110);

  ctx.font = 'italic 18px serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('Established by the State Legislature Act • Grade "A" Accredited Institution', 500, 145);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('OFFICIAL STATEMENT OF MARKS & GRADES', 500, 195);

  // Decorative divider line
  ctx.beginPath();
  ctx.moveTo(120, 215);
  ctx.lineTo(880, 215);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#94a3b8';
  ctx.stroke();

  // 4. Verification Check ID & Ref No Bar (Top box)
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(80, 240, 840, 75);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(80, 240, 840, 75);

  ctx.textAlign = 'left';
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#0f172a';

  // Handle specific scenarios
  let displayCheckId = candidate.checkId;
  let displayRefNo = candidate.refNo;
  let displayRegNo = candidate.regNo;
  let displayName = candidate.candidateName;

  if (index === 5) {
    // Scenario 5: spelling difference on doc ("MUHAMMAD" vs "MOHAMMAD")
    displayName = 'MUHAMMAD FARHAN';
  } else if (index === 8) {
    // Scenario 7: Conflicting registration number on doc
    displayRegNo = 'REG009999';
  }

  ctx.fillText(`CHECK ID: ${displayCheckId || 'NOT-ASSIGNED'}`, 105, 275);
  ctx.fillText(`REF NO: ${displayRefNo || 'PENDING-VERIFY'}`, 530, 275);

  // 5. Candidate details block
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#334155';

  const startY = 360;
  const lineH = 38;

  ctx.fillText('NAME OF CANDIDATE:', 100, startY);
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(displayName, 340, startY);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('REGISTRATION NO:', 100, startY + lineH);
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(displayRegNo, 340, startY + lineH);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('ROLL NUMBER:', 580, startY + lineH);
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(candidate.rollNo, 740, startY + lineH);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('COURSE / PROGRAMME:', 100, startY + lineH * 2);
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(candidate.course, 340, startY + lineH * 2);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('EXAMINATION YEAR:', 100, startY + lineH * 3);
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('2025 (SEMESTER VIII)', 340, startY + lineH * 3);

  // 6. Realistic Academic Grades Table
  const tableTop = 540;
  ctx.fillStyle = '#1e3a5f';
  ctx.fillRect(80, tableTop, 840, 42);

  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('CODE', 100, tableTop + 27);
  ctx.fillText('SUBJECT TITLE', 210, tableTop + 27);
  ctx.fillText('MAX', 560, tableTop + 27);
  ctx.fillText('OBTAINED', 660, tableTop + 27);
  ctx.fillText('GRADE', 810, tableTop + 27);

  const subjects = [
    { code: 'CS-401', name: 'Distributed Systems & Cloud Computing', max: '100', obt: '88', grade: 'A+' },
    { code: 'CS-402', name: 'Machine Learning & Predictive Models', max: '100', obt: '94', grade: 'O' },
    { code: 'CS-403', name: 'Information & Network Security', max: '100', obt: '82', grade: 'A' },
    { code: 'CS-404', name: 'Compiler Design & Formal Languages', max: '100', obt: '79', grade: 'B+' },
    { code: 'CS-405', name: 'Engineering Capstone Project Lab', max: '100', obt: '96', grade: 'O' },
  ];

  subjects.forEach((sub, sIdx) => {
    const rowY = tableTop + 42 + sIdx * 45;
    ctx.fillStyle = sIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
    ctx.fillRect(80, rowY, 840, 45);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(80, rowY, 840, 45);

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#334155';
    ctx.fillText(sub.code, 100, rowY + 28);

    ctx.font = '14px sans-serif';
    ctx.fillText(sub.name, 210, rowY + 28);
    ctx.fillText(sub.max, 570, rowY + 28);

    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(sub.obt, 680, rowY + 28);
    ctx.fillText(sub.grade, 825, rowY + 28);
  });

  // Table summary
  const summaryY = tableTop + 42 + subjects.length * 45;
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(80, summaryY, 840, 45);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(80, summaryY, 840, 45);

  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('GRAND TOTAL: 439 / 500 (87.8%)  •  RESULT: FIRST CLASS WITH DISTINCTION', 120, summaryY + 28);

  // 7. Official Seal & Signature stamps
  // Red circular university seal
  ctx.save();
  ctx.beginPath();
  ctx.arc(240, 1020, 65, 0, Math.PI * 2);
  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(240, 1020, 56, 0, Math.PI * 2);
  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = 'bold 10px sans-serif';
  ctx.fillStyle = '#b91c1c';
  ctx.textAlign = 'center';
  ctx.fillText('★ OFFICIAL UNIVERSITY SEAL ★', 240, 1015);
  ctx.fillText('EXAMINATION CONTROLLER', 240, 1030);
  ctx.restore();

  // Signatures
  ctx.textAlign = 'center';
  ctx.font = 'italic 20px cursive';
  ctx.fillStyle = '#1e3a5f';
  ctx.fillText('Dr. R. K. Saxena', 740, 995);

  ctx.beginPath();
  ctx.moveTo(630, 1015);
  ctx.lineTo(850, 1015);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Controller of Examinations', 740, 1035);

  // 8. Security Barcode & Document Footer
  ctx.fillStyle = '#0f172a';
  for (let b = 0; b < 40; b++) {
    const w = (b % 3 === 0 ? 4 : 2);
    ctx.fillRect(100 + b * 7, 1160, w, 40);
  }

  ctx.textAlign = 'left';
  ctx.font = '11px monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText(`DOC-SECURE-HASH: 8F7E${candidate.regNo}AA29 • ISSUED FOR RECRUITMENT & VERIFICATION`, 100, 1225);
  ctx.fillText('System Generated Document - Verified under National Document Exchange Protocol', 100, 1245);

  // Convert canvas to blob / File
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.92));
  const filename = candidate.officialFilename || `Doc_${candidate.checkId || index + 1}.jpg`;
  return new File([blob], filename, { type: 'image/jpeg', lastModified: Date.now() });
}

/**
 * Generate sample Excel workbook with candidate records (and multiple sheets to test scenario 15)
 */
export function generateSampleExcelWorkbook(): { file: File; records: any[]; mapping: ColumnMapping; strategy: FilenameStrategy } {
  const records = SAMPLE_CANDIDATES.map((c, idx) => ({
    'Candidate Name': c.candidateName,
    'Check ID': c.checkId,
    'Ref No.': c.refNo,
    'Registration No.': c.regNo, // Leading zeros like "001245"
    'Roll Number': c.rollNo,
    'Official File Name': c.officialFilename,
    'University': c.university,
    'Course': c.course,
    'Document Type': 'Marksheet',
    'Verification Scenario': c.testNote,
  }));

  const wb = XLSX.utils.book_new();

  // Main Candidates Sheet
  const ws1 = XLSX.utils.json_to_sheet(records);
  XLSX.utils.book_append_sheet(wb, ws1, 'Candidates_Master');

  // Second Sheet: Institution Reference (Scenario 15: multiple sheets)
  const institutions = [
    { Code: 'DTU', Name: 'Delhi Technological University', State: 'Delhi' },
    { Code: 'AU', Name: 'Anna University', State: 'Tamil Nadu' },
    { Code: 'MU', Name: 'Mumbai University', State: 'Maharashtra' },
  ];
  const ws2 = XLSX.utils.json_to_sheet(institutions);
  XLSX.utils.book_append_sheet(wb, ws2, 'University_Directory');

  const excelBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const excelBlob = new Blob([excelBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const excelFile = new File([excelBlob], 'Candidate_Master_Records.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const mapping: ColumnMapping = {
    candidateName: 'Candidate Name',
    officialFilename: 'Official File Name',
    checkId: 'Check ID',
    refNo: 'Ref No.',
    regNo: 'Registration No.',
    rollNo: 'Roll Number',
    appNo: '',
    university: 'University',
    course: 'Course',
    documentType: 'Document Type',
  };

  const strategy: FilenameStrategy = {
    method: 'checkId',
    customColumn: '',
    combinedColumns: [],
    prefix: '',
    suffix: '',
    separator: '_',
    handleDuplicates: 'numbered',
    casing: 'original',
  };

  return { file: excelFile, records, mapping, strategy };
}
