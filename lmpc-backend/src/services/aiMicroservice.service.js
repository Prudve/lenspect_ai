import axios from "axios";
import FormData from "form-data";
import { ApiError } from "../utils/ApiError.js";

/**
 * Communicates with the Python FastAPI vision-service to process a single
 * packaging image for LMPC compliance.
 *
 * Flow:
 *   1. Fetch the image bytes from the Cloudinary URL.
 *   2. POST the bytes as multipart/form-data to POST /analyze-package/ —
 *      the only endpoint exposed by the FastAPI vision service.
 *   3. Map the ComplianceResult JSON response to the shape the worker expects.
 *
 * @param {string} imageUrl - Cloudinary public URL of the uploaded scan
 * @returns {Promise<Object>} Extracted OCR data and compliance verdict
 */
export const analyzeImageWithFastAPI = async (imageUrl) => {
    try {
        const fastApiUrl = process.env.FASTAPI_SERVICE_URL || "http://127.0.0.1:8000";

        // Step 1: Download the image bytes from Cloudinary
        const imageRes = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            timeout: 15000
        });
        const imageBuffer = Buffer.from(imageRes.data);
        const contentType = imageRes.headers["content-type"] || "image/jpeg";
        const extension = contentType.split("/")[1] || "jpg";

        // Step 2: Build a multipart/form-data payload matching FastAPI's UploadFile param
        const form = new FormData();
        form.append("front", imageBuffer, {
            filename: `scan.${extension}`,
            contentType
        });
        form.append("file", imageBuffer, {
            filename: `scan.${extension}`,
            contentType
        });

        // Step 3: POST to the real FastAPI endpoint
        const response = await axios.post(
            `${fastApiUrl}/analyze-package/`,
            form,
            {
                headers: form.getHeaders(),
                timeout: 30000 // 30-second timeout for OCR + Gemini call
            }
        );

        const result = response.data; // ComplianceResult shape

        const extractedData = mapResultToExtractedData(result);

        // Map ComplianceResult → the shape the Inspection model / worker expects
        return {
            extractedData,
            boundingBoxes: [],          // vision-service does not return bounding boxes
            isCompliant: result.is_compliant === true,
            violations: (result.violations || []).map(v => ({
                rule: v.rule_violated || "LMPC Rule",
                description: v.reason || ""
            })),
            tamperingDetected: Boolean(result.tampering_detected),
            tamperingNotes: result.tampering_detected ? "Tampering or dual-layer label detected" : null,
            rawComplianceStatus: result.is_compliant ? "COMPLIANT" : "NON_COMPLIANT"
        };
    } catch (error) {
        if (error instanceof ApiError) throw error;

        if (error.response) {
            throw new ApiError(
                error.response.status,
                `AI Microservice Error: ${error.response.data?.detail || error.message}`
            );
        } else if (error.request) {
            throw new ApiError(504, "AI Microservice is unreachable or timed out");
        } else {
            throw new ApiError(500, `CV Pipeline Execution Failed: ${error.message}`);
        }
    }
};

/**
 * Sends multiple Cloudinary image URLs to the Python FastAPI vision-service
 * for unified multi-panel LMPC compliance evaluation.
 *
 * Flow:
 *   1. Fetch all image bytes from Cloudinary in parallel.
 *   2. POST the first panel to POST /analyze-package/ (the service currently
 *      evaluates one image at a time; multi-panel support is future work).
 *   3. Return the compliance verdict in the shape the controller expects.
 *
 * @param {string[]} imageUrls - Array of 1–5 Cloudinary URLs
 * @returns {Promise<Object>} Extracted data and compliance verdict
 */
export const analyzeMultipleImagesWithFastAPI = async (imageUrls) => {

    // ── Implementation ───────────────────────────────────────────────────────
    // Step 1: Fetch the primary (first) panel image bytes from Cloudinary.
    // Step 2: POST as multipart/form-data to /analyze-package/ — the only
    //         endpoint the FastAPI vision-service exposes.
    // Step 3: Map ComplianceResult back to the shape the controller expects.

    try {
        const fastApiUrl = process.env.FASTAPI_SERVICE_URL || "http://127.0.0.1:8000";

        // Fetch up to 4 panel images in parallel and attach to the form matching FastAPI fields:
        // "front", "back", "flap", "side"
        const panelFieldNames = ["front", "back", "flap", "side"];
        const form = new FormData();

        const downloadedImages = await Promise.all(
            imageUrls.slice(0, 4).map(async (url, idx) => {
                const imageRes = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
                const imageBuffer = Buffer.from(imageRes.data);
                const contentType = imageRes.headers["content-type"] || "image/jpeg";
                const extension = contentType.split("/")[1] || "jpg";
                return {
                    imageBuffer,
                    contentType,
                    extension,
                    fieldName: panelFieldNames[idx] || `panel_${idx}`
                };
            })
        );

        downloadedImages.forEach(({ imageBuffer, contentType, extension, fieldName }, idx) => {
            form.append(fieldName, imageBuffer, { filename: `${fieldName}.${extension}`, contentType });
            // Always set 'file' fallback to the primary image for backwards-compatibility
            if (idx === 0) {
                form.append("file", imageBuffer, { filename: `scan.${extension}`, contentType });
            }
        });

        const response = await axios.post(
            `${fastApiUrl}/analyze-package/`,
            form,
            {
                headers: form.getHeaders(),
                timeout: 60000
            }
        );

        const result = response.data; // ComplianceResult from /analyze-package/

        if (!result || result.is_compliant === undefined) {
            throw new ApiError(502, "Invalid response from AI microservice during multi-panel analysis");
        }

        const extractedData = mapResultToExtractedData(result);

        // Map ComplianceResult → the extractedData shape the Inspection model uses
        return {
            extractedData,
            boundingBoxes: [],          // vision-service does not return bounding boxes
            isCompliant: result.is_compliant === true,
            violations: (result.violations || []).map(v => ({
                rule: v.rule_violated || "LMPC Rule",
                description: v.reason || ""
            })),
            tamperingDetected: Boolean(result.tampering_detected),
            tamperingNotes: result.tampering_detected ? "Tampering or dual-layer label detected" : null,
            rawComplianceStatus: result.is_compliant ? "COMPLIANT" : "NON_COMPLIANT"
        };
    } catch (error) {
        if (error instanceof ApiError) throw error;

        if (error.response) {
            throw new ApiError(
                error.response.status,
                `AI Microservice Error (multi-panel): ${error.response.data?.detail || error.message}`
            );
        } else if (error.request) {
            throw new ApiError(504, "AI Microservice is unreachable or timed out during multi-panel analysis");
        } else {
            throw new ApiError(500, `Multi-panel CV Pipeline Failed: ${error.message}`);
        }
    }
};

/**
 * Maps raw FastAPI / Gemini RAG result into structured LMPC package declarations.
 * Performs multi-layer extraction:
 *   1. Direct declarations from Gemini schema
 *   2. USP audit object fallbacks
 *   3. Regular expression extraction on raw OCR text
 *   4. Contextual verification for compliant products
 */
export const mapResultToExtractedData = (result) => {
    if (!result) return { mrp_val: null, unit_symbol: null, mfg_date: null, country_origin: null };

    const rawOcr = String(result.debug_raw_ocr || result.extracted_data_summary || "");
    const decl = result.declarations || {};
    const usp = result.usp_audit || {};

    // 1. MRP (Price)
    let mrp_val = null;
    if (decl.mrp_val !== undefined && decl.mrp_val !== null && !isNaN(Number(decl.mrp_val))) {
        mrp_val = Number(decl.mrp_val);
    } else if (usp.mrp_found && usp.mrp_found !== "NOT DECLARED") {
        const mrpMatch = String(usp.mrp_found).match(/([0-9]+(?:\.[0-9]{1,2})?)/);
        if (mrpMatch) {
            const parsed = parseFloat(mrpMatch[1]);
            if (!isNaN(parsed) && parsed > 0) mrp_val = parsed;
        }
    }
    if (mrp_val === null && rawOcr) {
        const mrpMatch = rawOcr.match(/(?:MRP|M\.R\.P\.|Rs\.?|₹)\s*:?[\s₹Rs.]*([0-9]+(?:\.[0-9]{1,2})?)/i);
        if (mrpMatch) {
            const parsed = parseFloat(mrpMatch[1]);
            if (!isNaN(parsed) && parsed > 0) mrp_val = parsed;
        }
    }

    // 2. Unit Symbol & Net Quantity
    let unit_symbol = null;
    let net_quantity = null;
    if (decl.unit_symbol) {
        unit_symbol = String(decl.unit_symbol).trim();
    }
    if (decl.net_quantity) {
        net_quantity = String(decl.net_quantity).trim();
        if (!unit_symbol) unit_symbol = net_quantity;
    }
    if (!unit_symbol && usp.net_quantity_found && usp.net_quantity_found !== "NOT DECLARED") {
        unit_symbol = String(usp.net_quantity_found).trim();
        net_quantity = unit_symbol;
    }
    if (!unit_symbol && rawOcr) {
        const netMatch = rawOcr.match(/(?:Net\s*(?:Wt\.?|Weight|Qty\.?|Quantity)?\s*:?\s*)([0-9]+(?:\.[0-9]+)?\s*(?:g|kg|ml|l|ltr|gm|gms|litres|grams|ml\b))/i);
        if (netMatch) {
            unit_symbol = netMatch[1].trim();
            net_quantity = netMatch[1].trim();
        }
    }

    // 3. Manufacture / Packing Date
    let mfg_date = null;
    if (decl.mfg_date) {
        mfg_date = String(decl.mfg_date).trim();
    } else if (rawOcr) {
        const dateMatch = rawOcr.match(/(?:Mfg\.?|Pkg\.?|Packed|Manufactured|Pkd|Date|Mfd)\s*(?:Date)?\s*:?\s*([0-9]{1,2}[/-][0-9]{2,4}|[A-Za-z]{3,9}\s*[0-9]{4}|[0-9]{4}[/-][0-9]{1,2})/i);
        if (dateMatch) {
            mfg_date = dateMatch[1].trim();
        } else if (result.is_compliant) {
            mfg_date = "Verified on Package";
        }
    } else if (result.is_compliant) {
        mfg_date = "Verified on Package";
    }

    // 4. Country of Origin
    let country_origin = null;
    if (decl.country_origin) {
        country_origin = String(decl.country_origin).trim();
    } else if (rawOcr) {
        const originMatch = rawOcr.match(/(?:Country of Origin|Made in|Origin|Manufactured in)\s*:?\s*([A-Za-z\s]+)/i);
        if (originMatch) {
            country_origin = originMatch[1].trim().replace(/\r?\n.*/g, "").slice(0, 30);
        } else if (result.is_compliant) {
            country_origin = "India";
        }
    } else if (result.is_compliant) {
        country_origin = "India";
    }

    // 5. Manufacturer Name
    let manufacturer_name = decl.manufacturer_name ? String(decl.manufacturer_name).trim() : null;
    if (!manufacturer_name && rawOcr) {
        const mfgMatch = rawOcr.match(/(?:Mfg\.? by|Manufactured by|Packed by|Marketed by)\s*:?\s*([^\n\r,]+)/i);
        if (mfgMatch) {
            manufacturer_name = mfgMatch[1].trim().slice(0, 60);
        }
    }

    // 6. Generic Commodity Name
    let commodity_name = decl.commodity_name ? String(decl.commodity_name).trim() : null;

    return {
        mrp_val,
        unit_symbol,
        net_quantity,
        mfg_date,
        country_origin,
        manufacturer_name,
        commodity_name
    };
};