import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadSection } from './components/UploadSection';
import { ColumnMappingSection } from './components/ColumnMappingSection';
import { ProcessingProgressSection } from './components/ProcessingProgressSection';
import { ReviewTableSection } from './components/ReviewTableSection';
import { ExportAndVerificationSection } from './components/ExportAndVerificationSection';
import { ImageInspectionModal } from './components/ImageInspectionModal';
import { DocumentationModal } from './components/DocumentationModal';

import {
  ColumnMapping,
  ExcelRecord,
  ExtractedIdentifiers,
  FilenameStrategy,
  ImageItem,
  MatchStatus,
  OcrEngineType,
} from './types';
import { parseExcelFile, parseWorksheet, autoDetectColumns } from './utils/excelParser';
import { performOcrOnImage, terminateOcrWorker } from './utils/ocrEngine';
import {
  matchImageAgainstExcel,
  generateProposedFilename,
  resolveFilenameCollisions,
} from './utils/matchingEngine';
import {
  generateSampleExcelWorkbook,
  generateSyntheticMarksheetImage,
  SAMPLE_CANDIDATES,
} from './utils/sampleDataGenerator';
import { createThumbnail } from './utils/imageUtils';
import { analyzeDocumentWithAI, batchResolveWithAI } from './utils/aiAssistant';

export default function App() {
  // Navigation
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [inspectingImage, setInspectingImage] = useState<ImageItem | null>(null);

  // Core Data
  const [images, setImages] = useState<ImageItem[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [rawWorkbook, setRawWorkbook] = useState<any>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<ExcelRecord[]>([]);

  // Configuration
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
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
  });

  const [filenameStrategy, setFilenameStrategy] = useState<FilenameStrategy>({
    method: 'checkId',
    customColumn: '',
    combinedColumns: [],
    prefix: '',
    suffix: '',
    separator: '_',
    handleDuplicates: 'numbered',
    casing: 'original',
  });

  // Processing state
  const [ocrEngine, setOcrEngine] = useState<OcrEngineType>('ensemble');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [concurrency, setConcurrency] = useState<number>(2);
  const [boostContrast, setBoostContrast] = useState<boolean>(true);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState<boolean>(false);
  const [isResolvingAI, setIsResolvingAI] = useState<boolean>(false);

  // Processing Cancel token
  const cancelProcessingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Handle Excel upload
  const handleExcelUpload = async (file: File) => {
    try {
      const parsed = await parseExcelFile(file);
      setExcelFile(file);
      setRawWorkbook(parsed.rawWorkbook);
      setSheetNames(parsed.sheetNames);
      setSelectedSheet(parsed.selectedSheet);
      setHeaders(parsed.headers);
      setRecords(parsed.records);

      // Auto-detect columns
      const detected = autoDetectColumns(parsed.headers);
      setColumnMapping(detected);

      // Default strategy recommendation based on detected columns
      if (detected.checkId) {
        setFilenameStrategy((prev) => ({ ...prev, method: 'checkId' }));
      } else if (detected.refNo) {
        setFilenameStrategy((prev) => ({ ...prev, method: 'refNo' }));
      } else if (detected.officialFilename) {
        setFilenameStrategy((prev) => ({ ...prev, method: 'official' }));
      }
    } catch (err: any) {
      alert(`Error loading Excel file: ${err?.message || 'Invalid format'}`);
    }
  };

  // Change worksheet
  const handleSelectSheet = (sheetName: string) => {
    if (!rawWorkbook) return;
    const { headers: newHeaders, records: newRecords } = parseWorksheet(rawWorkbook, sheetName);
    setSelectedSheet(sheetName);
    setHeaders(newHeaders);
    setRecords(newRecords);
    const detected = autoDetectColumns(newHeaders);
    setColumnMapping(detected);
  };

  // Add more images to batch
  const handleAddImages = (newItems: ImageItem[]) => {
    setImages((prev) => [...prev, ...newItems]);
  };

  // Remove single image
  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Clear all images
  const handleClearImages = () => {
    setImages([]);
    setCurrentIndex(0);
  };

  // Reset entire session
  const handleResetSession = async () => {
    if (images.length > 0 && !confirm('Are you sure you want to clear this entire session? All data will be reset.')) {
      return;
    }
    cancelProcessingRef.current = true;
    await terminateOcrWorker();
    setImages([]);
    setExcelFile(null);
    setRawWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setHeaders([]);
    setRecords([]);
    setCurrentStep(1);
    setIsProcessing(false);
    setIsPaused(false);
    setCurrentIndex(0);
  };

  // Load Built-in Sample Test Suite (10 realistic candidate documents covering all 20 scenarios)
  const handleLoadSampleData = async () => {
    setIsGeneratingBatch(true);
    try {
      const { file: sampleExcel, records: sampleRecords, mapping: sampleMapping, strategy: sampleStrategy } =
        generateSampleExcelWorkbook();

      await handleExcelUpload(sampleExcel);
      setColumnMapping(sampleMapping);
      setFilenameStrategy(sampleStrategy);

      // Generate synthetic images
      const sampleItems: ImageItem[] = [];
      for (let i = 0; i < SAMPLE_CANDIDATES.length; i++) {
        const cand = SAMPLE_CANDIDATES[i];
        const imgFile = await generateSyntheticMarksheetImage(cand, i);
        const { previewUrl, originalUrl, width, height } = await createThumbnail(imgFile, 800);

        sampleItems.push({
          id: `sample_img_${i + 1}`,
          file: imgFile,
          name: imgFile.name,
          size: imgFile.size,
          type: imgFile.type,
          previewUrl,
          originalUrl,
          width,
          height,
          rotation: 0,
          status: 'pending',
        });
      }

      setImages(sampleItems);
      setCurrentStep(1);
    } catch (err: any) {
      alert(`Error loading sample suite: ${err?.message}`);
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  // Stress-test batch generator (50 / 100 / 500 images)
  const handleGenerateBatch = async (count: number) => {
    setIsGeneratingBatch(true);
    try {
      // Ensure we have an Excel file
      if (!excelFile || records.length === 0) {
        const { file: sampleExcel } = generateSampleExcelWorkbook();
        await handleExcelUpload(sampleExcel);
      }

      const generated: ImageItem[] = [];
      const batchToCreate = Math.min(count, 500 - images.length);

      for (let i = 0; i < batchToCreate; i++) {
        const template = SAMPLE_CANDIDATES[i % SAMPLE_CANDIDATES.length];
        const uniqueCand: typeof template = {
          ...template,
          checkId: `CHK${2000 + images.length + i + 1}`,
          refNo: `REF${80000 + images.length + i + 1}`,
          regNo: `REG00${3000 + images.length + i + 1}`,
          rollNo: `ROLL${60000 + images.length + i + 1}`,
          officialFilename: `Document_Batch_${images.length + i + 1}.jpg`,
        };

        const imgFile = await generateSyntheticMarksheetImage(uniqueCand, i);
        const { previewUrl, originalUrl, width, height } = await createThumbnail(imgFile, 800);

        generated.push({
          id: `batch_img_${Date.now()}_${i}`,
          file: imgFile,
          name: imgFile.name,
          size: imgFile.size,
          type: imgFile.type,
          previewUrl,
          originalUrl,
          width,
          height,
          rotation: 0,
          status: 'pending',
        });
      }

      setImages((prev) => [...prev, ...generated]);
    } catch (err: any) {
      alert(`Error generating batch: ${err?.message}`);
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  // Process a single image through OCR & Matching
  const processSingleImage = async (
    img: ImageItem,
    currentRecords: ExcelRecord[],
    currentMapping: ColumnMapping,
    currentStrategy: FilenameStrategy,
    engineOverride?: OcrEngineType
  ): Promise<ImageItem> => {
    try {
      const activeEngine = engineOverride || ocrEngine;
      const ocrResult = await performOcrOnImage(img.file, img.rotation, boostContrast, activeEngine);

      let matchResult;
      let proposed = img.name;
      let status: 'done' | 'review' | 'not' = 'review';

      if (currentRecords && currentRecords.length > 0) {
        matchResult = matchImageAgainstExcel(
          ocrResult.extractedIdentifiers,
          img.name,
          currentRecords,
          currentMapping
        );
        proposed = generateProposedFilename(img, matchResult.matchedRecord, currentStrategy, currentMapping);
        status = matchResult.status === 'DONE' ? 'done' : matchResult.status === 'REVIEW' ? 'review' : 'not';
      } else {
        // If no Excel master records are uploaded yet, propose filename based on extracted Check ID / Ref No / Name
        const id =
          ocrResult.extractedIdentifiers.checkId ||
          ocrResult.extractedIdentifiers.refNo ||
          ocrResult.extractedIdentifiers.regNo ||
          ocrResult.extractedIdentifiers.rollNo ||
          (ocrResult.extractedIdentifiers.candidateName
            ? ocrResult.extractedIdentifiers.candidateName.replace(/\s+/g, '_')
            : '');
        const ext = img.name.substring(img.name.lastIndexOf('.')) || '.jpg';
        if (id) {
          proposed = `${id}${ext}`;
          status = 'done';
        }
        matchResult = {
          matchedRecordId: null,
          matchedRecord: null,
          status: (status === 'done' ? 'DONE' : 'REVIEW') as MatchStatus,
          confidenceScore: ocrResult.confidence,
          matchedCriteria: id ? [`Extracted Document Identifier: ${id}`] : [],
          conflicts: [],
          reason: id
            ? `OCR extracted identifier "${id}". Proposing filename "${proposed}". Upload an Excel sheet to link with master records.`
            : 'Document text extracted. Please upload an Excel sheet to match candidates.',
        };
      }

      return {
        ...img,
        ocrResult,
        matchResult,
        proposedFilename: proposed,
        finalFilename: proposed,
        status,
      };
    } catch (err: any) {
      return {
        ...img,
        status: 'not',
        reviewNotes: `OCR Failed: ${err?.message || 'Processing error'}`,
        errorMessage: err?.message,
      };
    }
  };

  // Execute Batch Processing Runner with Concurrency & Pause/Resume
  const handleStartProcessing = async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setIsPaused(false);
    cancelProcessingRef.current = false;

    let updatedImages = [...images];

    for (let i = 0; i < updatedImages.length; i++) {
      if (cancelProcessingRef.current) break;

      // Handle Pause
      while (isPausedRef.current && !cancelProcessingRef.current) {
        await new Promise((r) => setTimeout(r, 200));
      }
      if (cancelProcessingRef.current) break;

      setCurrentIndex(i);

      // Only process if pending or not done yet
      if (!updatedImages[i].ocrResult) {
        const processedItem = await processSingleImage(
          updatedImages[i],
          records,
          columnMapping,
          filenameStrategy
        );
        updatedImages[i] = processedItem;

        // Update state in real-time
        setImages([...updatedImages]);
      }
    }

    // Resolve filename collisions across the entire batch
    const resolved = resolveFilenameCollisions(updatedImages);
    setImages(resolved);

    setIsProcessing(false);
    setIsPaused(false);
  };

  const handlePauseProcessing = () => {
    setIsPaused(true);
  };

  const handleResumeProcessing = () => {
    setIsPaused(false);
  };

  const handleCancelProcessing = () => {
    cancelProcessingRef.current = true;
    setIsProcessing(false);
    setIsPaused(false);
  };

  // Approve a single image match as DONE
  const handleApproveImage = (id: string) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id === id) {
          return {
            ...img,
            status: 'done',
            userApproved: true,
            reviewNotes: 'User manually reviewed and approved match.',
          };
        }
        return img;
      })
    );
  };

  // Reject a single image match as NOT MATCHED
  const handleRejectImage = (id: string) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id === id) {
          return {
            ...img,
            status: 'not',
            manualOverrideRecordId: null,
            reviewNotes: 'User marked document as Unmatched.',
          };
        }
        return img;
      })
    );
  };

  // Approve all eligible matches: REVIEW items with high confidence and zero conflicts
  const handleApproveAllEligible = () => {
    setImages((prev) =>
      prev.map((img) => {
        if (
          img.status === 'review' &&
          (img.matchResult?.confidenceScore || 0) >= 80 &&
          (img.matchResult?.conflicts.length || 0) === 0
        ) {
          return {
            ...img,
            status: 'done',
            userApproved: true,
            reviewNotes: 'Batch approved under strict high-confidence rule.',
          };
        }
        return img;
      })
    );
  };

  // Reassign candidate manually
  const handleReassignCandidate = (imageId: string, recordId: string) => {
    const targetRec = records.find((r) => r.__id === recordId) || null;

    setImages((prev) => {
      const updated = prev.map((img) => {
        if (img.id === imageId) {
          const proposed = generateProposedFilename(img, targetRec, filenameStrategy, columnMapping);
          return {
            ...img,
            manualOverrideRecordId: recordId,
            proposedFilename: proposed,
            finalFilename: proposed,
            status: 'done' as const,
            userApproved: true,
            reviewNotes: `Manually reassigned to Excel Row #${targetRec?.__rowNum} (${targetRec && columnMapping.candidateName ? targetRec[columnMapping.candidateName] : ''})`,
          };
        }
        return img;
      });
      return resolveFilenameCollisions(updated);
    });
  };

  // Update identifiers manually from modal
  const handleUpdateIdentifiers = (imageId: string, identifiers: ExtractedIdentifiers) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id === imageId && img.ocrResult) {
          const updatedOcr = {
            ...img.ocrResult,
            extractedIdentifiers: {
              ...img.ocrResult.extractedIdentifiers,
              ...identifiers,
            },
          };
          const matchResult = matchImageAgainstExcel(
            updatedOcr.extractedIdentifiers,
            img.name,
            records,
            columnMapping
          );
          const proposed = generateProposedFilename(img, matchResult.matchedRecord, filenameStrategy, columnMapping);

          return {
            ...img,
            ocrResult: updatedOcr,
            matchResult,
            proposedFilename: proposed,
            finalFilename: proposed,
            status: matchResult.status === 'DONE' ? 'done' : matchResult.status === 'REVIEW' ? 'review' : 'not',
          };
        }
        return img;
      })
    );
  };

  // Update proposed filename directly
  const handleUpdateProposedFilename = (id: string, newFilename: string) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id === id) {
          return {
            ...img,
            finalFilename: newFilename,
            proposedFilename: newFilename,
          };
        }
        return img;
      })
    );
  };

  // Retry OCR on a specific image
  const handleRetryOcr = async (img: ImageItem, engine?: OcrEngineType) => {
    const updated = await processSingleImage(img, records, columnMapping, filenameStrategy, engine);
    setImages((prev) => prev.map((i) => (i.id === img.id ? updated : i)));
    if (inspectingImage && inspectingImage.id === img.id) {
      setInspectingImage(updated);
    }
  };

  // Resolve a single image using Gemini 3.8 Flash Multimodal AI
  const handleResolveSingleWithAI = async (img: ImageItem) => {
    setIsResolvingAI(true);
    try {
      const aiResult = await analyzeDocumentWithAI(img, records, columnMapping);

      const targetRec = records.find((r) => r.__id === aiResult.matchedCandidateId) || null;
      const proposed = generateProposedFilename(img, targetRec, filenameStrategy, columnMapping);

      const updatedImg: ImageItem = {
        ...img,
        manualOverrideRecordId: aiResult.matchedCandidateId,
        ocrResult: {
          rawText: img.ocrResult?.rawText || '',
          normalizedText: img.ocrResult?.normalizedText || '',
          confidence: aiResult.confidence,
          extractedIdentifiers: {
            ...img.ocrResult?.extractedIdentifiers,
            candidateName: aiResult.candidateName || img.ocrResult?.extractedIdentifiers.candidateName,
            checkId: aiResult.checkId || img.ocrResult?.extractedIdentifiers.checkId,
            refNo: aiResult.refNo || img.ocrResult?.extractedIdentifiers.refNo,
            regNo: aiResult.regNo || img.ocrResult?.extractedIdentifiers.regNo,
            rollNo: aiResult.rollNo || img.ocrResult?.extractedIdentifiers.rollNo,
          },
          durationMs: img.ocrResult?.durationMs || 0,
          rotation: img.rotation,
        },
        proposedFilename: proposed,
        finalFilename: proposed,
        status: aiResult.status === 'DONE' ? 'done' : aiResult.status === 'REVIEW' ? 'review' : 'not',
        userApproved: aiResult.status === 'DONE',
        reviewNotes: `AI Resolution (Gemini): ${aiResult.reasoning}`,
      };

      setImages((prev) => {
        const next = prev.map((i) => (i.id === img.id ? updatedImg : i));
        return resolveFilenameCollisions(next);
      });

      if (inspectingImage && inspectingImage.id === img.id) {
        setInspectingImage(updatedImg);
      }
    } catch (err: any) {
      alert(`AI resolution notice: ${err?.message || 'Failed to analyze'}`);
    } finally {
      setIsResolvingAI(false);
    }
  };

  // Batch resolve all ambiguous/review documents with Gemini AI
  const handleBatchResolveWithAI = async () => {
    const unresolved = images.filter((img) => img.status !== 'done');
    if (unresolved.length === 0) return;

    setIsResolvingAI(true);
    try {
      const resolutions = await batchResolveWithAI(unresolved, records, columnMapping);

      setImages((prev) => {
        const updated = prev.map((img) => {
          const res = resolutions.find((r) => r.itemId === img.id);
          if (!res) return img;

          const targetRec = records.find((r) => r.__id === res.matchedCandidateId) || null;
          const proposed = generateProposedFilename(img, targetRec, filenameStrategy, columnMapping);

          return {
            ...img,
            manualOverrideRecordId: res.matchedCandidateId,
            proposedFilename: proposed,
            finalFilename: proposed,
            status:
              res.status === 'DONE'
                ? ('done' as const)
                : res.status === 'REVIEW'
                ? ('review' as const)
                : ('not' as const),
            userApproved: res.status === 'DONE',
            reviewNotes: `AI Batch Resolution: ${res.reasoning}`,
          };
        });
        return resolveFilenameCollisions(updated);
      });
    } catch (err: any) {
      alert(`Batch AI resolution notice: ${err?.message || 'Failed to batch resolve'}`);
    } finally {
      setIsResolvingAI(false);
    }
  };

  // Keep modal in sync with state changes
  useEffect(() => {
    if (inspectingImage) {
      const refreshed = images.find((i) => i.id === inspectingImage.id);
      if (refreshed) setInspectingImage(refreshed);
    }
  }, [images]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Global Header */}
      <Header
        currentStep={currentStep}
        totalImages={images.length}
        totalExcelRecords={records.length}
        onResetSession={handleResetSession}
        onLoadSampleData={handleLoadSampleData}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Step Navigation Tabs */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex items-center justify-between overflow-x-auto shadow-sm">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {[
              { num: 1, label: '1. Upload Files', badge: `${images.length} imgs` },
              { num: 2, label: '2. Column Mapping', badge: columnMapping.checkId ? 'Mapped' : 'Default' },
              { num: 3, label: '3. OCR Engine', badge: isProcessing ? 'Running' : 'Ready' },
              { num: 4, label: '4. Review & Approval', badge: `${images.filter((i) => i.status === 'done').length} Done` },
              { num: 5, label: '5. Audit & Export', badge: '4 Deliverables' },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;

              return (
                <button
                  key={step.num}
                  onClick={() => setCurrentStep(step.num)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isPast
                      ? 'bg-slate-800/80 text-emerald-400 hover:bg-slate-800'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <span>{step.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive
                        ? 'bg-indigo-700 text-white'
                        : isPast
                        ? 'bg-emerald-950 text-emerald-300'
                        : 'bg-slate-850 text-slate-500'
                    }`}
                  >
                    {step.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Step Content */}
        {currentStep === 1 && (
          <UploadSection
            images={images}
            onAddImages={handleAddImages}
            onRemoveImage={handleRemoveImage}
            onClearImages={handleClearImages}
            excelFile={excelFile}
            excelSheetCount={sheetNames.length}
            excelRecordCount={records.length}
            onExcelUpload={handleExcelUpload}
            onProceedToMapping={() => {
              if (excelFile && records.length > 0) {
                setCurrentStep(2);
              } else {
                setCurrentStep(3);
                handleStartProcessing();
              }
            }}
            onGenerateBatch={handleGenerateBatch}
            isGeneratingBatch={isGeneratingBatch}
            onSelectImageForInspection={(img) => setInspectingImage(img)}
            ocrEngine={ocrEngine}
            onOcrEngineChange={setOcrEngine}
          />
        )}

        {currentStep === 2 && (
          <ColumnMappingSection
            sheetNames={sheetNames}
            selectedSheet={selectedSheet}
            onSelectSheet={handleSelectSheet}
            headers={headers}
            columnMapping={columnMapping}
            onUpdateColumnMapping={setColumnMapping}
            filenameStrategy={filenameStrategy}
            onUpdateFilenameStrategy={setFilenameStrategy}
            sampleRecord={records[0] || null}
            onProceedToProcessing={() => {
              setCurrentStep(3);
              handleStartProcessing();
            }}
            onBackToUpload={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <ProcessingProgressSection
            images={images}
            currentIndex={currentIndex}
            isProcessing={isProcessing}
            isPaused={isPaused}
            concurrency={concurrency}
            onConcurrencyChange={setConcurrency}
            boostContrast={boostContrast}
            onBoostContrastChange={setBoostContrast}
            ocrEngine={ocrEngine}
            onOcrEngineChange={setOcrEngine}
            onStartProcessing={handleStartProcessing}
            onPauseProcessing={handlePauseProcessing}
            onResumeProcessing={handleResumeProcessing}
            onCancelProcessing={handleCancelProcessing}
            onProceedToReview={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 4 && (
          <ReviewTableSection
            images={images}
            records={records}
            mapping={columnMapping}
            onApproveImage={handleApproveImage}
            onRejectImage={handleRejectImage}
            onApproveAllEligible={handleApproveAllEligible}
            onSelectImageForInspection={(img) => setInspectingImage(img)}
            onUpdateProposedFilename={handleUpdateProposedFilename}
            onProceedToVerification={() => setCurrentStep(5)}
            onBackToProgress={() => setCurrentStep(3)}
            onResolveWithAI={handleResolveSingleWithAI}
            onBatchResolveWithAI={handleBatchResolveWithAI}
            isResolvingAI={isResolvingAI}
          />
        )}

        {currentStep === 5 && (
          <ExportAndVerificationSection
            images={images}
            records={records}
            mapping={columnMapping}
            rawWorkbook={rawWorkbook}
            selectedSheet={selectedSheet}
            onBackToReview={() => setCurrentStep(4)}
          />
        )}
      </main>

      {/* Interactive Full Inspection Modal */}
      <ImageInspectionModal
        image={inspectingImage}
        onClose={() => setInspectingImage(null)}
        records={records}
        mapping={columnMapping}
        onApprove={handleApproveImage}
        onReject={handleRejectImage}
        onReassignCandidate={handleReassignCandidate}
        onUpdateIdentifiers={handleUpdateIdentifiers}
        onUpdateFilename={handleUpdateProposedFilename}
        onRetryOcr={handleRetryOcr}
        onAnalyzeWithAI={handleResolveSingleWithAI}
        isAnalyzingAI={isResolvingAI}
      />

      {/* Free Hosting & System Documentation Modal */}
      <DocumentationModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
