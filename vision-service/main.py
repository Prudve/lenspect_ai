import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse

from fastapi.middleware.cors import CORSMiddleware

# Import our modular logic
from vision_pipeline import extract_text_from_image
from knowledge_base import retrieve_relevant_rules
from rag_engine import evaluate_compliance

app = FastAPI(title="Legal Metrology RAG Vision Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Legal Metrology RAG Vision Service",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": ["/analyze-package/"]
    }

@app.get("/favicon.ico")
async def favicon():
    return JSONResponse(status_code=204, content={})

# Shared executor for running blocking OCR calls off the async event loop
_executor = ThreadPoolExecutor(max_workers=4)

# ── Panel label constants ─────────────────────────────────────────────────────
PANEL_LABELS = ["front", "back", "flap", "side"]


def _ocr_sync(image_bytes: bytes) -> dict:
    """Thin synchronous wrapper for extract_text_from_image (runs in thread pool)."""
    return extract_text_from_image(image_bytes)


# ── Multi-panel endpoint ───────────────────────────────────────────────────────

@app.post("/analyze-package/")
async def analyze_package(
    front: Optional[UploadFile] = File(None, description="Front panel image"),
    back:  Optional[UploadFile] = File(None, description="Back panel image"),
    flap:  Optional[UploadFile] = File(None, description="Flap/top panel image"),
    side:  Optional[UploadFile] = File(None, description="Side panel image"),
    file:  Optional[UploadFile] = File(None, description="Single scan image fallback"),
):
    """
    Accepts up to 4 panel images (front, back, flap, side) or single 'file'.
    - At least one image is mandatory.
    - All images are OCR-processed concurrently.
    - Text is consolidated as: [PANEL: FRONT] <text> [PANEL: BACK] <text> …
    - Tampering detection is OR-aggregated across all panels.
    - The combined text is passed through BM25 retrieval → Gemini audit.
    """
    if front is None and file is not None:
        front = file

    if front is None:
        raise HTTPException(
            status_code=400,
            detail="At least one package image ('front' or 'file') is required."
        )

    # Collect provided panels preserving label order
    panels: list[tuple[str, UploadFile]] = []
    for label, upload in zip(PANEL_LABELS, [front, back, flap, side]):
        if upload is not None:
            if not upload.content_type.startswith("image/"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Panel '{label}' must be an image, got: {upload.content_type}"
                )
            panels.append((label, upload))

    try:
        # ── Step 1: Read all panel images into memory ─────────────────────────
        panel_bytes: list[tuple[str, bytes]] = []
        for label, upload in panels:
            data = await upload.read()
            panel_bytes.append((label, data))

        # ── Step 2: Run OCR concurrently across all panels ────────────────────
        loop = asyncio.get_event_loop()
        ocr_tasks = [
            loop.run_in_executor(_executor, _ocr_sync, data)
            for _, data in panel_bytes
        ]
        ocr_results: list[dict] = await asyncio.gather(*ocr_tasks)
        # ocr_results[i] = {"text": str, "tampering_detected": bool}

        # ── Step 3: Consolidate panel texts with panel markers ─────────────────
        panel_text_parts: list[str] = []
        any_tampering = False

        for i, (label, _) in enumerate(panel_bytes):
            result = ocr_results[i]
            panel_text_parts.append(f"[PANEL: {label.upper()}] {result['text']}")
            if result["tampering_detected"]:
                any_tampering = True

        consolidated_ocr_text = " ".join(panel_text_parts)

        # ── Step 4: Retrieval — BM25 → Top-k Rules ────────────────────────────
        query_text = consolidated_ocr_text if len(consolidated_ocr_text.strip()) >= 5 else "MRP Net Quantity Date Manufacturer Address Unit Sale Price Commodity"
        retrieved_rules = retrieve_relevant_rules(query_text, top_k=5)

        # ── Step 5: Augmentation & Generation — Multimodal Gemini → JSON ──────
        raw_images = [data for _, data in panel_bytes]
        compliance_json_str = evaluate_compliance(
            ocr_text=consolidated_ocr_text,
            retrieved_rules=retrieved_rules,
            tampering_detected=any_tampering,
            image_bytes_list=raw_images
        )

        # ── Step 6: Assemble final response ───────────────────────────────────
        final_result = json.loads(compliance_json_str)

        # Inject debug info for logging/dashboard
        final_result["debug_raw_ocr"] = consolidated_ocr_text
        final_result["debug_panels_processed"] = [label for label, _ in panel_bytes]
        final_result["debug_tampering_per_panel"] = {
            panel_bytes[i][0]: ocr_results[i]["tampering_detected"]
            for i in range(len(panel_bytes))
        }

        return final_result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    # Run the server on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)