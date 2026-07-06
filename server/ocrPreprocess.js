import sharp from "sharp";
import { envBool } from "./perf.js";

export const OCR_FAST = envBool("OCR_FAST", false);

/** Target longest side for OCR preprocessing. Higher = sharper text, slower. */
const TARGET_MIN_PX = OCR_FAST ? 2200 : 3200;
const MAX_PX = OCR_FAST ? 3600 : 5000;

async function resizeForOcr(buffer) {
  const meta = await sharp(buffer).metadata();
  const w = meta.width || 800;
  const h = meta.height || 600;
  const longest = Math.max(w, h);

  let pipeline = sharp(buffer).rotate();

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

  return pipeline;
}

/**
 * Enhance scans/photos for OCR: grayscale, contrast, sharpen, upscale.
 */
export async function preprocessForOcr(buffer) {
  const pipeline = await resizeForOcr(buffer);
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

/** Softer pass for dense documents / photos with color noise */
export async function preprocessForOcrSoft(buffer) {
  const pipeline = await resizeForOcr(buffer);
  return pipeline
    .modulate({ saturation: 0.85 })
    .grayscale()
    .gamma(1.08)
    .normalize()
    .linear(1.08, -8)
    .sharpen({ sigma: 1.1 })
    .png()
    .toBuffer();
}

/** All preprocessing variants to try (accuracy mode uses every pass). */
export async function getOcrPreprocessVariants(buffer) {
  const standard = await preprocessForOcr(buffer);
  if (OCR_FAST) return [standard];

  const [aggressive, soft] = await Promise.all([
    preprocessForOcrAggressive(buffer),
    preprocessForOcrSoft(buffer),
  ]);
  return [standard, aggressive, soft];
}
