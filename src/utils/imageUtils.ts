/**
 * Utility functions for image preprocessing, canvas transformations,
 * high-resolution previews, and memory-safe image handling.
 */

export interface ImagePreviewData {
  previewUrl: string;
  originalUrl: string;
  width: number;
  height: number;
}

/**
 * Generate preview and retain full high-resolution original image URL
 */
export async function createThumbnail(file: File, _maxDim: number = 1600): Promise<ImagePreviewData> {
  return new Promise((resolve) => {
    // Retain full uncompressed raw object URL for razor-sharp inspection, OCR clarity, and zero blurriness
    const originalUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const origW = img.naturalWidth || 1200;
      const origH = img.naturalHeight || 1600;
      // Retain pristine originalUrl as previewUrl so images never degrade or become blurry
      resolve({ previewUrl: originalUrl, originalUrl, width: origW, height: origH });
    };

    img.onerror = () => {
      resolve({ previewUrl: originalUrl, originalUrl, width: 1200, height: 1600 });
    };

    img.src = originalUrl;
  });
}

/**
 * Preprocess image for OCR while strictly preserving full image sharpness and quality
 */
export async function preprocessImageForOcr(
  file: File,
  rotation: number = 0,
  boostContrast: boolean = false
): Promise<HTMLCanvasElement | File> {
  // If no rotation and no contrast requested, pass the raw pristine File directly!
  // Tesseract works best on the unmodified original bytes.
  if (rotation === 0 && !boostContrast) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const rad = (rotation * Math.PI) / 180;
        const sin = Math.abs(Math.sin(rad));
        const cos = Math.abs(Math.cos(rad));

        const origW = img.naturalWidth;
        const origH = img.naturalHeight;

        // Maintain full native resolution without downsampling!
        const canvasW = Math.round(origW * cos + origH * sin);
        const canvasH = Math.round(origW * sin + origH * cos);

        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw rotated
        ctx.translate(canvasW / 2, canvasH / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, -origW / 2, -origH / 2, origW, origH);
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Optional gentle contrast boost (only if explicitly enabled by user)
        if (boostContrast) {
          const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
          const d = imgData.data;

          for (let i = 0; i < d.length; i += 4) {
            // Perceived luminance
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            // Gentle linear contrast stretch without clipping fonts
            const adjusted = (gray - 128) * 1.15 + 128;
            const clamped = Math.max(0, Math.min(255, adjusted));

            d[i] = clamped;
            d[i + 1] = clamped;
            d[i + 2] = clamped;
          }

          ctx.putImageData(imgData, 0, 0);
        }

        URL.revokeObjectURL(url);
        resolve(canvas);
      } catch (err) {
        URL.revokeObjectURL(url);
        resolve(file); // Fallback to raw file on canvas error
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

/**
 * Format bytes into human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
