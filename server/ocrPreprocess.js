import sharp from "sharp";
import { envBool } from "./perf.js";

/** Target longest side for OCR preprocessing. Lower = faster. */
const TARGET_MIN_PX = envBool("OCR_FAST", true) ? 2200 : 2800;
const MAX_PX = envBool("OCR_FAST", true) ? 3600 : 4500;

/**
 * Enhance scans/photos for OCR: grayscale, contrast, sharpen, upscale.
 */
export async function preprocessForOcr(buffer) {
  const meta = await sharp(buffer).metadata();
  const w = meta.width || 800;
  const h = meta.height || 600;
  const longest = Math.max(w, h);

  let pipeline = sharp(buffer).rotate(); // respect EXIF orientation

  if (longest < TARGET_MIN_PX) {
    const scale = Math.min(TARGET_MIN_PX / longest, MAX_PX / longest);
    pipeline = pipeline.resize({
      width: Math.round(w * scale),
      height: Math.round(h * scale),
      kernel: sharp.kernel.lanczos3,
    });
  } else if (longest > MAX_PX) {
    const scale = MAX_PX / longest;
    pipeline = pipeline.resize({
      width: Math.round(w * scale),
      height: Math.round(h * scale),
      kernel: sharp.kernel.lanczos3,
    });
  }

  return pipeline
    .grayscale()
    .normalize()
    .linear(1.15, -12)
    .sharpen({ sigma: 1.4, m1: 0.5, m2: 0.35 })
    .png()
    .toBuffer();
}

/** Second pass: stronger contrast for faint text */
export async function preprocessForOcrAggressive(buffer) {
  const base = await preprocessForOcr(buffer);
  return sharp(base)
    .linear(1.35, -28)
    .threshold(168, { grayscale: true })
    .png()
    .toBuffer();
}
