"""High-accuracy OCR with watermark removal for security forms (PTA permits, etc.)."""
from __future__ import annotations

import io
import os
import re
import sys

import fitz
import numpy as np
from PIL import Image
import pytesseract

try:
    import cv2

    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

TESS_CONFIGS = [
    r"--oem 1 --psm 4 -c preserve_interword_spaces=1",
    r"--oem 1 --psm 6 -c preserve_interword_spaces=1",
    r"--oem 1 --psm 3 -c preserve_interword_spaces=1",
    r"--oem 1 --psm 11 -c preserve_interword_spaces=1",
]

PDF_MATRIX = fitz.Matrix(5, 5)


def _pil_to_cv(img: Image.Image) -> np.ndarray:
    arr = np.array(img.convert("RGB"))
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)


def _cv_to_pil(arr: np.ndarray) -> Image.Image:
    if len(arr.shape) == 2:
        rgb = cv2.cvtColor(arr, cv2.COLOR_GRAY2RGB)
    else:
        rgb = cv2.cvtColor(arr, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


def _upscale_gray(gray: np.ndarray, target: int = 3400) -> np.ndarray:
    h, w = gray.shape[:2]
    longest = max(h, w)
    if longest >= target:
        return gray
    scale = target / longest
    return cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_LANCZOS4)


def _preprocess_variants(gray: np.ndarray) -> list[np.ndarray]:
    gray = _upscale_gray(gray)
    variants: list[np.ndarray] = []

    # Top-hat removes repeating watermark / guilloche background
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (41, 41))
    tophat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kernel)
    tophat = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8)).apply(tophat)
    _, bin1 = cv2.threshold(tophat, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    variants.append(bin1)

    # Background normalization (divide by morphological opening)
    k2 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (35, 35))
    bg = cv2.morphologyEx(gray, cv2.MORPH_OPEN, k2)
    bg = np.clip(bg.astype(np.float32), 1, 255)
    norm = np.clip(gray.astype(np.float32) / bg * 180, 0, 255).astype(np.uint8)
    norm = cv2.bilateralFilter(norm, 7, 50, 50)
    norm = cv2.createCLAHE(clipLimit=2.4, tileGridSize=(8, 8)).apply(norm)
    bin2 = cv2.adaptiveThreshold(
        norm, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 41, 12
    )
    variants.append(bin2)

    # Black-hat emphasizes dark printed text
    blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)
    blackhat = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(blackhat)
    _, bin3 = cv2.threshold(blackhat, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    variants.append(bin3)

    return variants


def _score(text: str) -> float:
    text = (text or "").strip()
    if not text:
        return 0.0

    words = re.findall(r"[A-Za-z0-9\u0600-\u06FF]+", text)
    alnum = sum(len(w) for w in words)
    if alnum == 0:
        return 0.0

    short = sum(1 for w in words if len(w) <= 2)
    if len(words) > 12 and short / len(words) > 0.55:
        return alnum * 0.35

    score = alnum * 2.5 + len(words) * 10
    lower = text.lower()
    for kw in (
        "transport",
        "permit",
        "vehicle",
        "registration",
        "route",
        "khyber",
        "peshawar",
        "carrier",
        "address",
        "capacity",
        "renewed",
    ):
        if kw in lower:
            score += 25

    if re.search(r"\b[A-Z]{2,}\s+[A-Z]{2,}", text):
        score += 30
    if re.search(r"\b[A-Z]{2,}-\d{2,}\b", text):
        score += 40
    if re.search(r"\d{4,}", text):
        score += 15

    return score


def _ocr_from_gray(gray: np.ndarray, lang: str) -> str:
    if not HAS_CV2:
        pil = _cv_to_pil(gray)
        return pytesseract.image_to_string(pil, lang=lang or "eng", config=TESS_CONFIGS[0]).strip()

    best = ""
    best_score = 0.0

    for prep in _preprocess_variants(gray):
        pil = _cv_to_pil(prep)
        for config in TESS_CONFIGS:
            try:
                text = pytesseract.image_to_string(pil, lang=lang or "eng", config=config).strip()
            except pytesseract.TesseractError:
                continue
            s = _score(text)
            if s > best_score:
                best = text
                best_score = s
            if best_score > 800:
                return best

    return best


def _ocr_pil(img: Image.Image, lang: str) -> str:
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    if HAS_CV2:
        gray = cv2.cvtColor(_pil_to_cv(img), cv2.COLOR_BGR2GRAY)
        return _ocr_from_gray(gray, lang)

    return pytesseract.image_to_string(img, lang=lang or "eng", config=TESS_CONFIGS[0]).strip()


def ocr_image_bytes(data: bytes, lang: str = "eng") -> str:
    img = Image.open(io.BytesIO(data))
    return _ocr_pil(img, lang)


def ocr_pdf_path(pdf_path: str, lang: str = "eng") -> str:
    doc = fitz.open(pdf_path)
    parts: list[str] = []
    for i, page in enumerate(doc, start=1):
        pix = page.get_pixmap(matrix=PDF_MATRIX, alpha=False)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        text = _ocr_pil(img, lang)
        parts.append(f"--- Page {i} ---\n{text}")
    doc.close()
    return "\n\n".join(parts)


def main() -> None:
    if len(sys.argv) < 4:
        print("Usage: ocr.py <input> <output.txt> <tesseract-lang>", file=sys.stderr)
        sys.exit(1)

    input_path, output_path, lang = sys.argv[1], sys.argv[2], sys.argv[3]
    if not os.path.isfile(input_path):
        print(f"Input not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    ext = os.path.splitext(input_path)[1].lower()
    if ext == ".pdf":
        text = ocr_pdf_path(input_path, lang)
    else:
        with open(input_path, "rb") as f:
            text = ocr_image_bytes(f.read(), lang)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text or "")


if __name__ == "__main__":
    main()
