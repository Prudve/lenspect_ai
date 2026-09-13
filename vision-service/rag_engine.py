from typing import Optional
import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

# 1. Load the variables from .env into the environment
load_dotenv()

# 2. genai.Client() will now automatically detect GEMINI_API_KEY
client = genai.Client()

# ── Output Schema ─────────────────────────────────────────────────────────────

class Violation(BaseModel):
    rule_violated: str = Field(
        description="The specific rule number violated, e.g., 'Rule 6(1)(e)' or 'Rule 6(11)'"
    )
    reason: str = Field(
        description="Explanation based ONLY on the retrieved rules and the extracted text"
    )

class UspAudit(BaseModel):
    mrp_found: str = Field(
        description="MRP value extracted from the package text, e.g., '₹50' or 'Rs. 50'"
    )
    net_quantity_found: str = Field(
        description="Net quantity extracted from the package text, e.g., '500g' or '200ml'"
    )
    computed_usp: float = Field(
        description=(
            "Unit Sale Price computed by the auditor: MRP (numeric) divided by Net Quantity (numeric). "
            "Round to 2 decimal places."
        )
    )
    printed_usp: str = Field(
        description=(
            "The Unit Sale Price as printed on the package, e.g., '₹0.10 per g'. "
            "Set to 'NOT DECLARED' if absent."
        )
    )
    usp_deviation_percent: float = Field(
        description=(
            "Absolute percentage deviation between computed_usp and the numeric value of printed_usp. "
            "Set to 0.0 if printed_usp is 'NOT DECLARED'."
        )
    )
    usp_compliant: bool = Field(
        description=(
            "True if printed_usp is absent OR if deviation is ≤ 1 %. "
            "False if deviation exceeds 1 % — flags a Rule 6(11) violation."
        )
    )

class ExtractedDeclarations(BaseModel):
    mrp_val: Optional[float] = Field(
        default=None,
        description="Numeric Maximum Retail Price in rupees (e.g. 45.0, 99.0). Extract from price text like Rs. 50, ₹50, MRP 50."
    )
    net_quantity: Optional[str] = Field(
        default=None,
        description="Declared net quantity string as printed (e.g. '500 g', '200 ml', '1 kg', '1 L')."
    )
    unit_symbol: Optional[str] = Field(
        default=None,
        description="Standard unit of measurement symbol (e.g. 'g', 'kg', 'ml', 'l')."
    )
    mfg_date: Optional[str] = Field(
        default=None,
        description="Date of manufacture, packing, or import (e.g. '09/2024' or '2024-08-15')."
    )
    country_origin: Optional[str] = Field(
        default=None,
        description="Country of origin declared on the package (e.g. 'India')."
    )
    manufacturer_name: Optional[str] = Field(
        default=None,
        description="Name of the manufacturer, packer, or importer."
    )
    commodity_name: Optional[str] = Field(
        default=None,
        description="Generic or common name of the packaged commodity (e.g. 'Biscuits', 'Atta', 'Soap')."
    )

class ComplianceResult(BaseModel):
    is_compliant: bool = Field(
        description="True if NO rules are violated and no tampering is detected, False otherwise"
    )
    extracted_data_summary: str = Field(
        description="A concise summary of what was found on the package across all panels"
    )
    declarations: Optional[ExtractedDeclarations] = Field(
        default=None,
        description="Structured extracted statutory declarations identified on the package"
    )
    language_check_passed: bool = Field(
        description=(
            "True if mandatory declarations (name, net qty, MRP, dates) appear in "
            "Hindi (Devnagari script) or English. False if only a regional language is used."
        )
    )
    tampering_detected: bool = Field(
        description=(
            "True if the CV pipeline flagged a dual-layer sticker over the MRP region "
            "(Section 36 violation). Passed in from the vision pipeline — do NOT override."
        )
    )
    usp_audit: UspAudit = Field(
        description="Rule 6(11) Unit Sale Price mathematical audit result"
    )
    violations: list[Violation] = Field(
        description="List of all rule violations found. Empty list if fully compliant."
    )

# ── RAG Engine ────────────────────────────────────────────────────────────────

def evaluate_compliance(
    ocr_text: str,
    retrieved_rules: list[str],
    tampering_detected: bool = False,
    image_bytes_list: Optional[list[bytes]] = None
) -> str:
    """
    Constructs a grounded RAG prompt and uses Gemini 3.5 Flash-Lite (with multimodal
    vision when image bytes are provided) to return a JSON response matching ComplianceResult.

    Args:
        ocr_text          : Consolidated OCR text from all panels (with [PANEL:] markers).
        retrieved_rules   : Top-k statutory rules retrieved by BM25.
        tampering_detected: Boolean flag from the CV pipeline.
        image_bytes_list  : Optional list of raw image bytes (JPEG/PNG) from package panels.

    Returns:
        A JSON string guaranteed to match ComplianceResult schema.
    """

    # Combine the retrieved rules into a single context block
    rules_context = "\n".join(retrieved_rules)

    # Construct the grounded multimodal RAG prompt
    prompt = f"""
You are an expert Legal Metrology Officer and Auditor reviewing a commercial packaged commodity for compliance with
the Legal Metrology (Packaged Commodities) Rules, 2011 (India).
Inspect the package image(s) provided very carefully alongside any extracted OCR text.

═══════════════════════════════════════════════════════════════════
RULES TO ENFORCE
(Judge based on these statutes and standard LMPC 2011 provisions)
═══════════════════════════════════════════════════════════════════
{rules_context}

═══════════════════════════════════════════════════════════════════
RAW TEXT EXTRACTED FROM PACKAGE PANELS:
═══════════════════════════════════════════════════════════════════
"{ocr_text}"

═══════════════════════════════════════════════════════════════════
CV PIPELINE FLAGS
═══════════════════════════════════════════════════════════════════
tampering_detected: {str(tampering_detected).lower()}

═══════════════════════════════════════════════════════════════════
AUDIT INSTRUCTIONS
═══════════════════════════════════════════════════════════════════

STEP 0 — STATUTORY DECLARATION EXTRACTION:
  Visually inspect the packaging image(s) (and check OCR text) to extract all declared values into `declarations`:
  - `mrp_val`: Clean numeric value of Maximum Retail Price (e.g. 10.0, 20.0, 99.0). If absent, set null.
  - `net_quantity`: Declared net quantity string as printed (e.g. '25 g', '500 g', '200 ml', '1 kg', '1 L').
  - `unit_symbol`: Base unit symbol ('g', 'kg', 'ml', 'l', 'N', 'U').
  - `mfg_date`: Date or month/year of manufacture, packing, or import (e.g. '29/08/2026', '08/2024').
  - `country_origin`: Country of origin (e.g. 'India'). If product is manufactured or packed in India, set 'India'.
  - `manufacturer_name`: Name of the manufacturer, packer, marketer, or brand (e.g. 'PepsiCo India Holdings Pvt. Ltd.').
  - `commodity_name`: Generic or common name of the packaged commodity (e.g. 'Potato Chips', 'Biscuits', 'Wheat Flour').

STEP 1 — CORE MANDATORY DECLARATIONS (Rule 6):
  Verify the visual presence on the packaging of:
  (a) Manufacturer / Packer / Marketer name and address    → Rule 6(1)(a)
  (b) Generic / common name of the commodity               → Rule 6(1)(b)
  (c) Net quantity in standard units (g, kg, ml, l)        → Rule 6(1)(c)
  (e) Maximum Retail Price (MRP) in rupees                 → Rule 6(1)(e)
  (f) Date of manufacture, packing, or import              → Rule 6(1)(d)
  Only flag a declaration as missing if it is genuinely absent from the package.

STEP 2 — UNIT SYMBOL CORRECTNESS (Rule 13):
  Verify standard unit of measurement symbols: g, kg, ml, l.
  Symbols must be singular (g not gms, kg not kgs, ml not mls).

STEP 3 — UNIT SALE PRICE (USP) AUDIT (Rule 6(11)):
  Under Rule 6(11) of the Legal Metrology (Packaged Commodities) Rules:
  a. For packages with Net Quantity < 1 kg or < 1 L:
     - The Unit Sale Price may legally be declared either PER 100g / PER 100ml, OR PER g / PER ml.
     - Example: A 25g pack at MRP Rs. 10.00:
       * Computed USP per g    = 10.00 / 25 = Rs. 0.40 per g
       * Computed USP per 100g = (10.00 / 25) * 100 = Rs. 40.00 per 100g
       Both declarations (Rs. 0.40/g and Rs. 40/100g) are mathematically equivalent and fully compliant!
  b. Check the printed USP on the package:
     - If absent and package is small/exempt or USP not required, set printed_usp = "NOT DECLARED", usp_compliant = true.
     - If absent on packages where mandatory, flag Rule 6(11).
     - If printed, compare with computed USP taking the declared unit (per 100g vs per g) into account.
     - If deviation is <= 2%, mark usp_compliant = true.

STEP 4 — LANGUAGE CHECK (Rule 9):
  Ensure mandatory declarations appear in English or Hindi (Devnagari). If so, language_check_passed = true.

STEP 5 — TAMPERING CHECK (Section 36):
  Flag tampering only if there is visible evidence of an altered price sticker pasted over an original printed price.

STEP 6 — FINAL VERDICT:
  Set is_compliant = true IF all required declarations are present and valid, with NO genuine statutory violations.
  Set is_compliant = false ONLY IF mandatory declarations are truly missing or statutory violations exist.

Output your audit result EXACTLY matching the requested JSON schema.
"""

    # Assemble multimodal content list
    contents = []
    if image_bytes_list:
        for img_bytes in image_bytes_list:
            if img_bytes and len(img_bytes) > 0:
                try:
                    contents.append(types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"))
                except Exception as e:
                    print("[evaluate_compliance] Warning appending image part:", e)

    contents.append(prompt)

    # Call Gemini 3.5 Flash-Lite with Strict Schema Mode
    response = client.models.generate_content(
        model='gemini-3.5-flash-lite',
        contents=contents,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ComplianceResult,
            temperature=0.0
        )
    )

    return response.text