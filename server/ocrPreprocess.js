import sharp from "sharp";
import { envBool } from "./perf.js";

export const OCR_FAST = envBool("OCR_FAST", false);

const TARGET_MIN_PX = OCR_FAST ? 2200 : 3200;
const MAX_PX = OCR_FAST ? 4000 : 5200;

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

/** Standard — works for Latin and Urdu/Arabic (no harsh threshold). */
export async function preprocessForOcr(buffer) {
  const pipeline = await resizeForOcr(buffer);
  return pipeline
    .grayscale()
    .normalize()
    .linear(1.12, -10)
    .sharpen({ sigma: 1.2, m1: 0.45, m2: 0.3 })
    .png()
    .toBuffer();
}

/** For forms / faint scans — gentle contrast only. */
export async function preprocessForFormScan(buffer) {
  const pipeline = await resizeForOcr(buffer);
  return pipeline
    .grayscale()
    .normalize()
    .linear(1.25, -18)
    .median(1)
    .sharpen({ sigma: 0.9 })
    .png()
    .toBuffer();
}

/** Strong binarization — Latin-only fallback. */
export async function preprocessForOcrAggressive(buffer) {
  const base = await preprocessForOcr(buffer);
  return sharp(base)
    .linear(1.3, -24)
    .threshold(175, { grayscale: true })
    .png()
    .toBuffer();
}

export async function getOcrPreprocessVariants(buffer, quick = false, { includeAggressive = true } = {}) {
  const standard = await preprocessForOcr(buffer);
  if (quick || OCR_FAST) return [standard];

  const form = await preprocessForFormScan(buffer);
  const variants = [standard, form];
  if (includeAggressive) {
    variants.push(await preprocessForOcrAggressive(buffer));
  }
  return variants;
}
