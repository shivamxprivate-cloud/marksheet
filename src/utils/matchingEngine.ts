import { ColumnMapping, ExcelRecord, ExtractedIdentifiers, FilenameStrategy, ImageItem, MatchResult } from '../types';

/**
 * Sanitize a string to be a safe filesystem filename
 */
export function sanitizeFilename(name: string): string {
  if (!name) return 'UNNAMED_FILE';
  // Remove illegal characters: / \ : * ? " < > | and control chars
  let clean = name.replace(/[/\\:*?"<>|\x00-\x1F]/g, '_');
  // Trim spaces and dots at ends
  clean = clean.trim().replace(/^\.+|\.+$/g, '');
  return clean || 'UNNAMED_FILE';
}

/**
 * Extract extension from a filename (with dot), lowercase
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot !== -1 && lastDot < filename.length - 1) {
    return filename.substring(lastDot);
  }
  return '.jpg';
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Check name similarity considering initials, reordered tokens, and spelling
 */
export function evaluateNameSimilarity(ocrName?: string, excelName?: string): { score: number; reason: string } {
  if (!ocrName || !excelName) return { score: 0, reason: 'Missing name in one or both sources' };

  const cleanOcr = ocrName.toUpperCase().replace(/[^A-Z\s]/g, '').trim();
  const cleanExcel = excelName.toUpperCase().replace(/[^A-Z\s]/g, '').trim();

  if (!cleanOcr || !cleanExcel) return { score: 0, reason: 'Empty name' };

  // 1. Exact match
  if (cleanOcr === cleanExcel) {
    return { score: 100, reason: 'Exact name match' };
  }

  const ocrTokens = cleanOcr.split(/\s+/).filter(Boolean);
  const excelTokens = cleanExcel.split(/\s+/).filter(Boolean);

  // 2. Token set match (e.g. "HARISH CHANDRA" vs "CHANDRA HARISH")
  const ocrSorted = [...ocrTokens].sort().join(' ');
  const excelSorted = [...excelTokens].sort().join(' ');
  if (ocrSorted === excelSorted) {
    return { score: 95, reason: 'Reordered name match' };
  }

  // 3. Initials match (e.g. "H CHANDRA" vs "HARISH CHANDRA" or "HARISH C" vs "HARISH CHANDRA")
  const matchesInitial = (t1: string, t2: string) => {
    if (t1 === t2) return true;
    if (t1.length === 1 && t2.startsWith(t1)) return true;
    if (t2.length === 1 && t1.startsWith(t2)) return true;
    return false;
  };

  if (ocrTokens.length === excelTokens.length && ocrTokens.length > 1) {
    let allTokensCompatible = true;
    for (let i = 0; i < ocrTokens.length; i++) {
      if (!matchesInitial(ocrTokens[i], excelTokens[i])) {
        allTokensCompatible = false;
        break;
      }
    }
    if (allTokensCompatible) {
      return { score: 85, reason: 'Name initial variation match' };
    }
  }

  // 4. Minor spelling error (Levenshtein distance)
  const maxLen = Math.max(cleanOcr.length, cleanExcel.length);
  const dist = levenshteinDistance(cleanOcr, cleanExcel);
  const similarity = Math.max(0, 100 - (dist / maxLen) * 100);

  if (dist <= 2 && maxLen >= 6) {
    return { score: Math.round(similarity), reason: `Minor spelling variation (${dist} character difference)` };
  }

  return { score: Math.round(similarity), reason: `Low similarity (${Math.round(similarity)}%)` };
}

/**
 * Match a single image's OCR extracted identifiers against Excel candidates
 */
export function matchImageAgainstExcel(
  identifiers: ExtractedIdentifiers,
  originalFilename: string,
  records: ExcelRecord[],
  mapping: ColumnMapping
): MatchResult {
  if (records.length === 0) {
    return {
      matchedRecordId: null,
      matchedRecord: null,
      status: 'NOT',
      confidenceScore: 0,
      matchedCriteria: [],
      conflicts: ['Excel workbook contains zero candidate records'],
      reason: 'No Excel candidate records available for matching',
    };
  }

  const ocrCheckId = identifiers.checkId ? identifiers.checkId.toUpperCase().trim() : '';
  const ocrRefNo = identifiers.refNo ? identifiers.refNo.toUpperCase().trim() : '';
  const ocrRegNo = identifiers.regNo ? identifiers.regNo.toUpperCase().trim() : '';
  const ocrRollNo = identifiers.rollNo ? identifiers.rollNo.toUpperCase().trim() : '';
  const ocrName = identifiers.candidateName ? identifiers.candidateName.toUpperCase().trim() : '';
  const cleanOriginalName = originalFilename.toUpperCase();

  interface CandidateEvaluation {
    record: ExcelRecord;
    matchedCriteria: string[];
    conflicts: string[];
    priorityLevel: number; // 1 = CheckID, 2 = RefNo, 3 = RegNo, 4 = RollNo, 5 = Filename, 6 = Name+Inst, 7 = NameOnly
    confidence: number;
    hasContradiction: boolean;
  }

  const evaluations: CandidateEvaluation[] = [];

  for (const record of records) {
    const recCheckId = mapping.checkId && record[mapping.checkId] ? String(record[mapping.checkId]).toUpperCase().trim() : '';
    const recRefNo = mapping.refNo && record[mapping.refNo] ? String(record[mapping.refNo]).toUpperCase().trim() : '';
    const recRegNo = mapping.regNo && record[mapping.regNo] ? String(record[mapping.regNo]).toUpperCase().trim() : '';
    const recRollNo = mapping.rollNo && record[mapping.rollNo] ? String(record[mapping.rollNo]).toUpperCase().trim() : '';
    const recOfficialFile = mapping.officialFilename && record[mapping.officialFilename] ? String(record[mapping.officialFilename]).toUpperCase().trim() : '';
    const recName = mapping.candidateName && record[mapping.candidateName] ? String(record[mapping.candidateName]).toUpperCase().trim() : '';

    const matchedCriteria: string[] = [];
    const conflicts: string[] = [];
    let priorityLevel = 99;
    let confidence = 0;
    let hasContradiction = false;

    // Check Contradictions:
    // If image has an explicit RegNo and Excel has an explicit RegNo that does NOT match:
    if (ocrRegNo && recRegNo && ocrRegNo !== recRegNo) {
      conflicts.push(`Conflicting Registration Number: OCR shows "${ocrRegNo}" but Excel row ${record.__rowNum} has "${recRegNo}"`);
      hasContradiction = true;
    }
    // If image has Check ID and Excel has Check ID that does NOT match:
    if (ocrCheckId && recCheckId && ocrCheckId !== recCheckId) {
      conflicts.push(`Conflicting Check ID: OCR shows "${ocrCheckId}" but Excel row ${record.__rowNum} has "${recCheckId}"`);
      hasContradiction = true;
    }
    // If image has Ref No and Excel has Ref No that does NOT match:
    if (ocrRefNo && recRefNo && ocrRefNo !== recRefNo) {
      conflicts.push(`Conflicting Reference Number: OCR shows "${ocrRefNo}" but Excel row ${record.__rowNum} has "${recRefNo}"`);
      hasContradiction = true;
    }

    // PRIORITY 1: Exact Check ID Match
    if (ocrCheckId && recCheckId && ocrCheckId === recCheckId) {
      matchedCriteria.push(`Exact Check ID Match: "${ocrCheckId}"`);
      priorityLevel = Math.min(priorityLevel, 1);
      confidence = Math.max(confidence, 98);
    }

    // PRIORITY 2: Exact Reference Number Match
    if (ocrRefNo && recRefNo && ocrRefNo === recRefNo) {
      matchedCriteria.push(`Exact Reference Number Match: "${ocrRefNo}"`);
      priorityLevel = Math.min(priorityLevel, 2);
      confidence = Math.max(confidence, 96);
    }

    // PRIORITY 3: Exact Registration / Enrollment Number Match
    if (ocrRegNo && recRegNo && ocrRegNo === recRegNo) {
      matchedCriteria.push(`Exact Registration Number Match: "${ocrRegNo}"`);
      priorityLevel = Math.min(priorityLevel, 3);
      confidence = Math.max(confidence, 94);
    }

    // PRIORITY 4: Exact Roll Number Match
    if (ocrRollNo && recRollNo && ocrRollNo === recRollNo) {
      matchedCriteria.push(`Exact Roll Number Match: "${ocrRollNo}"`);
      priorityLevel = Math.min(priorityLevel, 4);
      confidence = Math.max(confidence, 92);
    }

    // PRIORITY 5: Exact Official Filename Match in original file
    if (recOfficialFile && cleanOriginalName.includes(recOfficialFile.replace(/\.[^/.]+$/, ''))) {
      matchedCriteria.push(`Filename Identifier Match: "${recOfficialFile}"`);
      priorityLevel = Math.min(priorityLevel, 5);
      confidence = Math.max(confidence, 88);
    }

    // Name comparison (supporting evidence or fallback)
    if (ocrName && recName) {
      const nameEval = evaluateNameSimilarity(ocrName, recName);
      if (nameEval.score >= 90) {
        matchedCriteria.push(`High Name Match (${nameEval.score}%): "${ocrName}" ≈ "${recName}" (${nameEval.reason})`);
        if (priorityLevel > 6) {
          priorityLevel = 6;
          confidence = Math.max(confidence, Math.round(nameEval.score * 0.85));
        }
      } else if (nameEval.score >= 75) {
        matchedCriteria.push(`Possible Name Match (${nameEval.score}%): "${ocrName}" ≈ "${recName}"`);
        if (priorityLevel > 7) {
          priorityLevel = 7;
          confidence = Math.max(confidence, 65);
        }
      }
    }

    // If strong identifier matched AND name matched, boost confidence to 100%
    if (priorityLevel <= 4 && matchedCriteria.some((c) => c.includes('Name Match'))) {
      confidence = 100;
    }

    if (matchedCriteria.length > 0) {
      evaluations.push({
        record,
        matchedCriteria,
        conflicts,
        priorityLevel,
        confidence,
        hasContradiction,
      });
    }
  }

  // Filter out candidates with severe contradictions
  const viable = evaluations.filter((e) => !e.hasContradiction);

  if (viable.length === 0) {
    if (evaluations.length > 0) {
      // All potential matches had contradictions!
      const topConflict = evaluations[0];
      return {
        matchedRecordId: null,
        matchedRecord: null,
        status: 'REVIEW',
        confidenceScore: 30,
        matchedCriteria: topConflict.matchedCriteria,
        conflicts: topConflict.conflicts,
        reason: `Contradictory identifiers detected: ${topConflict.conflicts.join(', ')}. Matching rejected automatically.`,
      };
    }

    return {
      matchedRecordId: null,
      matchedRecord: null,
      status: 'NOT',
      confidenceScore: 0,
      matchedCriteria: [],
      conflicts: ['No matching Check ID, Reference No, Registration No, or Candidate Name found in Excel'],
      reason: 'No reliable candidate match found for this document.',
    };
  }

  // Sort by priority level (1 is highest), then confidence score descending
  viable.sort((a, b) => {
    if (a.priorityLevel !== b.priorityLevel) return a.priorityLevel - b.priorityLevel;
    return b.confidence - a.confidence;
  });

  const bestMatch = viable[0];

  // Ambiguity check: if there is a tie on priority level 1 or 2 among different records
  const competing = viable.filter((v) => v.record.__id !== bestMatch.record.__id && v.priorityLevel === bestMatch.priorityLevel && Math.abs(v.confidence - bestMatch.confidence) < 10);

  if (competing.length > 0) {
    return {
      matchedRecordId: bestMatch.record.__id,
      matchedRecord: bestMatch.record,
      status: 'REVIEW',
      confidenceScore: 60,
      matchedCriteria: bestMatch.matchedCriteria,
      conflicts: [`Ambiguous candidate: Excel rows ${bestMatch.record.__rowNum} and ${competing[0].record.__rowNum} both match`],
      reason: `Ambiguous match: Multiple candidates match with similar priority. Manual user review required.`,
    };
  }

  // Determine status:
  // - DONE: Priority <= 4 (Exact CheckID, RefNo, RegNo, RollNo) with confidence >= 90
  // - REVIEW: Name-only match (priority 6/7) or confidence < 90
  let status: 'DONE' | 'REVIEW' | 'NOT' = 'REVIEW';
  let reason = '';

  if (bestMatch.priorityLevel <= 4 && bestMatch.confidence >= 90) {
    status = 'DONE';
    reason = `High-confidence match verified by ${bestMatch.matchedCriteria[0]}.`;
  } else if (bestMatch.priorityLevel === 5) {
    status = 'REVIEW';
    reason = `Matched by official filename identifier. Please visually confirm candidate.`;
  } else {
    status = 'REVIEW';
    reason = `Matched by candidate name only (${bestMatch.confidence}% confidence). Strict verification policy requires manual confirmation.`;
  }

  return {
    matchedRecordId: bestMatch.record.__id,
    matchedRecord: bestMatch.record,
    status,
    confidenceScore: bestMatch.confidence,
    matchedCriteria: bestMatch.matchedCriteria,
    conflicts: bestMatch.conflicts,
    reason,
  };
}

/**
 * Generate proposed filename based on selected strategy and matched Excel record
 */
export function generateProposedFilename(
  image: ImageItem,
  record: ExcelRecord | null,
  strategy: FilenameStrategy,
  mapping: ColumnMapping
): string {
  const origExt = getFileExtension(image.name);

  if (!record) {
    // Unmatched image retains its original filename
    return sanitizeFilename(image.name);
  }

  let baseIdentifier = '';

  switch (strategy.method) {
    case 'official': {
      if (mapping.officialFilename && record[mapping.officialFilename]) {
        baseIdentifier = String(record[mapping.officialFilename]);
      }
      break;
    }
    case 'checkId': {
      if (mapping.checkId && record[mapping.checkId]) {
        baseIdentifier = String(record[mapping.checkId]);
      }
      break;
    }
    case 'refNo': {
      if (mapping.refNo && record[mapping.refNo]) {
        baseIdentifier = String(record[mapping.refNo]);
      }
      break;
    }
    case 'regNo': {
      if (mapping.regNo && record[mapping.regNo]) {
        baseIdentifier = String(record[mapping.regNo]);
      }
      break;
    }
    case 'rollNo': {
      if (mapping.rollNo && record[mapping.rollNo]) {
        baseIdentifier = String(record[mapping.rollNo]);
      }
      break;
    }
    case 'candidateName': {
      if (mapping.candidateName && record[mapping.candidateName]) {
        baseIdentifier = String(record[mapping.candidateName]).replace(/\s+/g, '_');
      }
      break;
    }
    case 'custom': {
      if (strategy.customColumn && record[strategy.customColumn]) {
        baseIdentifier = String(record[strategy.customColumn]);
      }
      break;
    }
    case 'combined': {
      const parts: string[] = [];
      for (const col of strategy.combinedColumns) {
        if (record[col]) {
          parts.push(String(record[col]).trim());
        }
      }
      baseIdentifier = parts.join(strategy.separator || '_');
      break;
    }
  }

  // Fallbacks if selected column was empty
  if (!baseIdentifier) {
    if (mapping.checkId && record[mapping.checkId]) {
      baseIdentifier = String(record[mapping.checkId]);
    } else if (mapping.refNo && record[mapping.refNo]) {
      baseIdentifier = String(record[mapping.refNo]);
    } else if (mapping.candidateName && record[mapping.candidateName]) {
      baseIdentifier = String(record[mapping.candidateName]).replace(/\s+/g, '_');
    } else {
      baseIdentifier = `Candidate_Row_${record.__rowNum}`;
    }
  }

  // Apply casing
  if (strategy.casing === 'uppercase') {
    baseIdentifier = baseIdentifier.toUpperCase();
  } else if (strategy.casing === 'lowercase') {
    baseIdentifier = baseIdentifier.toLowerCase();
  }

  // Prefix and Suffix
  let finalBase = `${strategy.prefix || ''}${baseIdentifier}${strategy.suffix || ''}`;

  // If base already contains extension, strip it so we don't end up with .jpg.jpg
  if (finalBase.toLowerCase().endsWith(origExt.toLowerCase())) {
    finalBase = finalBase.substring(0, finalBase.length - origExt.length);
  }

  // Clean filesystem characters
  const safeBase = sanitizeFilename(finalBase);

  return `${safeBase}${origExt}`;
}

/**
 * Resolve filename collisions across the entire batch:
 * e.g. CHK1025.jpg, CHK1025 (01).jpg, CHK1025 (02).jpg
 */
export function resolveFilenameCollisions(images: ImageItem[]): ImageItem[] {
  const filenameCounts = new Map<string, number>();

  return images.map((img) => {
    let proposed = img.proposedFilename || sanitizeFilename(img.name);
    const ext = getFileExtension(proposed);
    const baseWithoutExt = proposed.substring(0, proposed.length - ext.length);

    const count = filenameCounts.get(proposed) || 0;
    filenameCounts.set(proposed, count + 1);

    if (count === 0) {
      return {
        ...img,
        finalFilename: proposed,
        collisionIndex: 0,
      };
    } else {
      // Collision detected! Use (01), (02) convention
      const formattedNum = String(count).padStart(2, '0');
      const resolvedFilename = `${baseWithoutExt} (${formattedNum})${ext}`;
      return {
        ...img,
        finalFilename: resolvedFilename,
        collisionIndex: count,
        reviewNotes: img.reviewNotes
          ? `${img.reviewNotes}; Multiple document collision resolved: assigned suffix (${formattedNum})`
          : `Multiple document collision resolved: assigned suffix (${formattedNum})`,
      };
    }
  });
}
