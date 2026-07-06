"""High-accuracy OCR with OpenCV preprocessing + Tesseract LSTM."""
from __future__ import annotations

import io
import os
import sys

import fitz
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract

try:
    import cv2

    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

TESS_CONFIGS = [
    r"--oem 1 --psm 3 -c preserve_interword_spaces=1",
    r"--oem 1 --psm 6 -c preserve_interword_spaces=1",
    r"--oem 1 --psm 11 -c preserve_interword_spaces=1",
    r"--oem 1 --psm 4 -c preserve_interword_spaces=1",
]

PDF_MATRIX = fitz.Matrix(4.5, 4.5)  # ~324 DPI


def _pil_to_cv(img: Image.Image) -> np.ndarray:
    arr = np.array(img.convert("RGB"))
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)


def _cv_to_pil(arr: np.ndarray) -> Image.Image:
    rgb = cv2.cvtColor(arr, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


def preprocess_pil(img: Image.Image) -> Image.Image:
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    w, h = img.size
    longest = max(w, h)
    target = 3200
    if longest < target:
        scale = target / longest
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

    if HAS_CV2:
        cv = _pil_to_cv(img)
        gray = cv2.cvtColor(cv, cv2.COLOR_BGR2GRAY)
        gray = cv2.fastNlMeansDenoising(gray, None, 8, 7, 21)
        gray = cv2.createCLAHE(clipLimit=2.4, tileGridSize=(8, 8)).apply(gray)
        binary = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 12
        )
        return _cv_to_pil(cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR))

    img = img.convert("L")
    img = ImageEnhance.Contrast(img).enhance(1.6)
    img = ImageEnhance.Sharpness(img).enhance(1.8)
    img = img.filter(ImageFilter.MedianFilter(size=3))
    return img.convert("RGB")


def _score(text: str) -> float:
    text = (text or "").strip()
    if not text:
        return 0.0
    alnum = sum(1 for ch in text if ch.isalnum())
    words = len(text.split())
    return alnum * 2 + words * 8


def _ocr_pil(img: Image.Image, lang: str) -> str:
    prep = preprocess_pil(img)
    best = ""
    best_score = 0.0
    for config in TESS_CONFIGS:
        text = pytesseract.image_to_string(prep, lang=lang or "eng", config=config).strip()
        s = _score(text)
        if s > best_score:
            best = text
            best_score = s
    return best


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
