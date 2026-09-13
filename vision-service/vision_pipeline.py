import cv2
import numpy as np
import pytesseract

# ──────────────────────────────────────────────────────────────────────────────
# Tesseract path is set at module level as a fallback, but is ALSO set
# explicitly inside every function that calls pytesseract to prevent Uvicorn
# worker-process caching issues on Windows where the module-level assignment
# may not propagate to forked worker processes.
# ──────────────────────────────────────────────────────────────────────────────
TESSERACT_CMD = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD


def _unwarp_cylindrical(img: np.ndarray) -> np.ndarray:
    """
    Applies a cylindrical unwarping remap to straighten curved text
    (e.g., labels wrapped around bottles or cans).

    Focal-length is derived from the image width so correction scales
    automatically with resolution.
    """
    h, w = img.shape[:2]
    f = float(w)  # focal-length heuristic — equal to image width

    map_x = np.zeros((h, w), dtype=np.float32)
    map_y = np.zeros((h, w), dtype=np.float32)

    cx, cy = w / 2.0, h / 2.0  # image centre

    # Build inverse map vectorised over columns for performance
    col_idx = np.arange(w, dtype=np.float32)
    theta = (col_idx - cx) / f                    # shape (w,)
    src_x = (f * np.tan(theta) + cx)              # shape (w,)
    cos_theta = np.cos(theta)                      # shape (w,)

    for y in range(h):
        map_x[y, :] = src_x
        map_y[y, :] = (y - cy) / cos_theta + cy

    unwarped = cv2.remap(
        img, map_x, map_y,
        interpolation=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REPLICATE
    )
    return unwarped


def _detect_tampering(gray: np.ndarray) -> bool:
    """
    Detects dual-layer sticker overlays on the MRP region — a common
    Section 36 tampering pattern where a second price sticker is pasted
    over the original printed price.

    Strategy:
      1. Isolate the bottom-third of the image where MRP labels typically appear.
      2. Run Canny edge detection.
      3. If edge density > 15 %, a sticker border (additional layer) is likely present.

    Returns True if tampering is suspected, False otherwise.
    """
    h = gray.shape[0]

    # Focus on the bottom-third where MRP is typically printed
    mrp_region = gray[int(h * 2 / 3):h, :]

    edges = cv2.Canny(mrp_region, threshold1=50, threshold2=150)

    region_pixels = mrp_region.shape[0] * mrp_region.shape[1]
    edge_pixels = int(np.sum(edges > 0))
    edge_density = edge_pixels / region_pixels if region_pixels > 0 else 0.0

    # 15 % density threshold — consistent with a visible sticker border
    TAMPERING_THRESHOLD = 0.15
    return edge_density > TAMPERING_THRESHOLD


def extract_text_from_image(image_bytes: bytes) -> dict:
    """
    Full preprocessing → OCR pipeline for a single image panel.

    Returns a dict with:
      - "text"               : str  — normalised, whitespace-collapsed OCR output
      - "tampering_detected" : bool — True if MRP-region sticker overlay is suspected
    """
    # ── MANDATORY: re-set inside function to prevent Uvicorn worker caching ───
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

    # 1. Decode bytes → OpenCV BGR image
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return {"text": "", "tampering_detected": False}

    # 2. Scale up (Tesseract accuracy peaks with text height ≈ 30–32 px)
    h, w = img.shape[:2]
    scale = 1.5 if max(h, w) < 2000 else 1.0
    if scale != 1.0:
        img_scaled = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    else:
        img_scaled = img

    # 3. Grayscale
    gray = cv2.cvtColor(img_scaled, cv2.COLOR_BGR2GRAY)

    # 4. Tampering detection on raw edge structure
    tampering = _detect_tampering(gray)

    # 5. Gaussian blur — removes high-frequency noise/foil artifacts
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)

    # 6. CLAHE — Adaptive Contrast Enhancement
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    contrast_enhanced = clahe.apply(blurred)

    # 7. OCR — PSM 3 (Fully Automatic Page Segmentation), OEM 3 (LSTM + legacy)
    custom_config = r'--oem 3 --psm 3'
    raw_ocr_text = pytesseract.image_to_string(contrast_enhanced, config=custom_config)

    # Collapse excess whitespace
    cleaned_text = " ".join(raw_ocr_text.split())

    return {
        "text": cleaned_text,
        "tampering_detected": tampering
    }
