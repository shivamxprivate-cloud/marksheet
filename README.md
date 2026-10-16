# DocuMatch & Rename Automator

A 100% free, browser-based bulk image matching, OCR extraction, collision-safe file renaming, and Excel verification suite capable of handling up to **500 images per batch**.

## Key Features

- **Bulk 500-Image Processing**: Upload individual image files directly (JPG, PNG, WEBP, BMP, TIFF) via drag-and-drop or file picker. No ZIP file required.
- **Client-Side Privacy**: 100% local execution using Tesseract.js Web Workers and HTML5 Canvas. Zero data leaves your computer.
- **Excel Auto-Detection**: Reads `.xlsx` and `.xls` workbooks with multi-sheet support. Auto-detects Candidate Name, Check ID, Reference No., Registration No., Roll No., and Official Filename columns.
- **Leading-Zero Preservation**: Protects identifiers like `001245` from truncation to `1245`.
- **Evidence-Based Matching Engine**: Multi-tiered priority hierarchy (Check ID → Ref No → Reg No → Roll No → Filename → Verified Name variations).
- **Contradiction Safety**: Automatically halts and flags documents showing conflicting identification numbers for manual review. Never guesses candidate identity.
- **Collision-Safe Renaming**: Prevents accidental overwrites when multiple documents belong to the same candidate by applying `(01)`, `(02)` sequential suffixes.
- **Two-Pass Verification**: Pass 1 (Matching & Filename Audit) and Pass 2 (Export & Excel Verification).
- **Four Production Deliverables**:
  1. `Renamed_Matched_Images.zip`
  2. `Unmatched_Images.zip` (with `Unresolved_Report.csv`)
  3. `Processed_Excel.xlsx` (with candidate status, matched images, and `Processing_Audit` worksheet)
  4. `Complete_Package.zip` (Structured archive with all 4 deliverables, text logs, and audit trail)

---

## Getting Started Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser.

### 3. Build for Production
```bash
npm run build
```
The optimized static build will be placed in the `dist/` directory.

---

## Free Static Hosting & Deployment

This application contains no backend APIs, no databases, and no proprietary server dependencies. It can be hosted entirely for free on:

### Cloudflare Pages
1. Push your repository to GitHub.
2. In Cloudflare Dashboard, select **Pages** > **Create a project** > **Connect to Git**.
3. Set **Framework preset**: `Vite`
4. Set **Build command**: `npm run build`
5. Set **Build output directory**: `dist`
6. Click **Save and Deploy**.

### Vercel Hobby (Free Tier)
1. Import repository from GitHub in Vercel.
2. Framework preset will automatically be detected as `Vite`.
3. Output directory: `dist`.
4. Click **Deploy**.

### Netlify (Free Tier)
1. Link your GitHub repository in Netlify.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Click **Deploy site**.

---

## Offline & Worker Caching
- On initial launch, Tesseract.js loads the open-source English language dataset (~4MB).
- Once cached in the browser's IndexedDB / Cache storage, the application operates 100% offline without requiring internet connectivity.
