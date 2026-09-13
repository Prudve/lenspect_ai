import PDFDocument from "pdfkit";
import fs from "fs";
import https from "https";
import http from "http";
import QRCode from "qrcode";
import path from "path";

// ──────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Downloads a remote image URL and returns a Buffer.
 * Follows redirects. Works for both http and https Cloudinary URLs.
 */
const _fetchImageBuffer = (url) =>
    new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https : http;
        client.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // Follow single redirect (Cloudinary signed URLs)
                return _fetchImageBuffer(res.headers.location).then(resolve).catch(reject);
            }
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => resolve(Buffer.concat(chunks)));
            res.on("error", reject);
        }).on("error", reject);
    });

/**
 * Generates a QR code PNG as a Buffer from a text string.
 * Uses `qrcode` library with error-correction level H (highest).
 */
const _generateQRBuffer = async (text) => {
    const dataUrl = await QRCode.toDataURL(text, {
        errorCorrectionLevel: "H",
        width: 150,
        margin: 1
    });
    // dataUrl = "data:image/png;base64,<b64>" — strip the prefix
    const base64 = dataUrl.split(",")[1];
    return Buffer.from(base64, "base64");
};

/** Draws a horizontal rule at the current Y position. */
const _hr = (doc, color = "#CBD5E0") => {
    doc.strokeColor(color).lineWidth(0.5)
       .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
};

// ──────────────────────────────────────────────────────────────────────────────
// Main Export
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Generates a legally formatted Show-Cause Notice PDF under the Legal
 * Metrology (Packaged Commodities) Rules, 2011.
 *
 * Includes:
 *  • Embedded package panel thumbnails (fetched from Cloudinary URLs)
 *  • GPS coordinates, NTP timestamp, and Officer ID
 *  • Itemised AI violations (rule number + reason)
 *  • Section 63(4) BSA Certificate with SHA-256 hash as an embedded QR code
 *
 * @param {Object} noticeData - Notice metadata
 * @param {string} noticeData.noticeNumber      - Unique notice reference
 * @param {*}      noticeData.inspectionId      - MongoDB ObjectId of the inspection
 * @param {*}      noticeData.inspectorId       - MongoDB ObjectId of the officer
 * @param {string} noticeData.inspectorName     - Officer full name
 * @param {Date}   noticeData.createdAt         - Issue date/time
 * @param {Object} noticeData.extractedData     - OCR-extracted package fields
 * @param {Array}  noticeData.violations        - AI violation objects {rule, description}
 * @param {{ latitude: number, longitude: number }} noticeData.gps - Inspection GPS
 * @param {string} noticeData.networkTimestamp  - NTP-sourced ISO timestamp
 * @param {string} noticeData.evidenceHash      - SHA-256 hex digest (BSA §63 certificate)
 * @param {string[]} [noticeData.imageUrls]     - Cloudinary thumbnail URLs to embed
 *
 * @param {string} outputPath - Absolute local path where the PDF will be written
 * @returns {Promise<string>} Resolves with outputPath on success
 */
export const generateNoticePDF = async (noticeData, outputPath) => {
    // ── Pre-fetch thumbnails and QR code in parallel (before opening write stream) ──
    const imageUrls = noticeData.imageUrls || [];

    const [thumbnailBuffers, qrBuffer] = await Promise.all([
        // Fetch up to 4 panel thumbnails; skip any that fail
        Promise.all(
            imageUrls.slice(0, 4).map((url) =>
                _fetchImageBuffer(url).catch(() => null)
            )
        ),
        // Generate QR code encoding the SHA-256 hash
        noticeData.evidenceHash
            ? _generateQRBuffer(noticeData.evidenceHash)
            : Promise.resolve(null)
    ]);

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: "A4", autoFirstPage: true });
            const writeStream = fs.createWriteStream(outputPath);
            doc.pipe(writeStream);

            // ── HEADER ──────────────────────────────────────────────────────
            doc.fillColor("#1A365D")
               .fontSize(16)
               .font("Helvetica-Bold")
               .text("LEGAL METROLOGY COMPLIANCE DEPARTMENT", { align: "center" });

            doc.moveDown(0.3);
            doc.fontSize(13)
               .fillColor("#C53030")
               .text("SHOW-CAUSE NOTICE OF NON-COMPLIANCE", { align: "center" });

            doc.moveDown(0.4);
            doc.fontSize(8).fillColor("#718096")
               .text(
                   "Issued under the Legal Metrology (Packaged Commodities) Rules, 2011 " +
                   "and the Legal Metrology Act, 2009",
                   { align: "center" }
               );

            doc.moveDown(1);
            _hr(doc, "#1A365D");
            doc.moveDown(1);

            // ── SECTION 1: NOTICE METADATA ──────────────────────────────────
            doc.font("Helvetica-Bold").fontSize(11).fillColor("#1A365D")
               .text("1. Notice Details");
            doc.moveDown(0.4);

            doc.font("Helvetica").fontSize(10).fillColor("#2D3748");
            const meta = [
                ["Notice Number",    noticeData.noticeNumber],
                ["Date & Time",      new Date(noticeData.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST"],
                ["Officer ID",       String(noticeData.inspectorId)],
                ["Officer Name",     noticeData.inspectorName || "—"],
                ["Inspection ID",    String(noticeData.inspectionId)],
                ["GPS Coordinates",  noticeData.gps
                    ? `${noticeData.gps.latitude.toFixed(6)}° N, ${noticeData.gps.longitude.toFixed(6)}° E`
                    : "Not recorded"],
                ["Network Timestamp", noticeData.networkTimestamp || "—"]
            ];
            meta.forEach(([key, val]) => {
                doc.text(`${key}:`, { continued: true, width: 150 })
                   .fillColor("#4A5568").text(`  ${val}`).fillColor("#2D3748");
            });

            doc.moveDown(1);
            _hr(doc);
            doc.moveDown(1);

            // ── SECTION 2: PACKAGE THUMBNAILS ───────────────────────────────
            const validThumbs = thumbnailBuffers.filter(Boolean);
            if (validThumbs.length > 0) {
                doc.font("Helvetica-Bold").fontSize(11).fillColor("#1A365D")
                   .text("2. Photographic Evidence (Package Scan Panels)");
                doc.moveDown(0.6);

                const thumbW = 110;
                const thumbH = 110;
                const gap    = 12;
                let thumbX   = 50;
                const thumbY = doc.y;

                const panelLabels = ["Front", "Back", "Flap", "Side"];
                validThumbs.forEach((buf, i) => {
                    doc.image(buf, thumbX, thumbY, { width: thumbW, height: thumbH });
                    doc.font("Helvetica").fontSize(8).fillColor("#718096")
                       .text(panelLabels[i] || `Panel ${i + 1}`, thumbX, thumbY + thumbH + 3, { width: thumbW, align: "center" });
                    thumbX += thumbW + gap;
                });

                doc.y = thumbY + thumbH + 20;
                doc.moveDown(1);
                _hr(doc);
                doc.moveDown(1);
            }

            // ── SECTION 3: EXTRACTED PACKAGE DECLARATIONS ───────────────────
            const sectionNum = validThumbs.length > 0 ? 3 : 2;
            doc.font("Helvetica-Bold").fontSize(11).fillColor("#1A365D")
               .text(`${sectionNum}. Extracted Package Declarations`);
            doc.moveDown(0.4);

            const ext = noticeData.extractedData || {};
            doc.font("Helvetica").fontSize(10).fillColor("#4A5568");
            doc.text(`• MRP Value:             ${ext.mrp_val != null ? `₹${ext.mrp_val}` : "NOT DETECTED / MISSING"}`);
            doc.text(`• Unit / Weight Symbol:  ${ext.unit_symbol || "NOT DETECTED / MISSING"}`);
            doc.text(`• Manufacturing Date:    ${ext.mfg_date ? new Date(ext.mfg_date).toLocaleDateString("en-IN") : "NOT DETECTED / MISSING"}`);
            doc.text(`• Country of Origin:     ${ext.country_origin || "NOT DETECTED / MISSING"}`);

            doc.moveDown(1);
            _hr(doc);
            doc.moveDown(1);

            // ── SECTION 4: STATUTORY VIOLATIONS ─────────────────────────────
            doc.font("Helvetica-Bold").fontSize(11).fillColor("#1A365D")
               .text(`${sectionNum + 1}. Established Statutory Violations`);
            doc.moveDown(0.4);

            const violations = noticeData.violations || [];
            if (violations.length > 0) {
                violations.forEach((v, i) => {
                    const rule = v.rule_violated || v.rule || "Unknown Rule";
                    const reason = v.reason || v.description || "No description provided.";

                    doc.font("Helvetica-Bold").fontSize(10).fillColor("#9B2C2C")
                       .text(`${i + 1}. [${rule}]`);
                    doc.font("Helvetica").fontSize(10).fillColor("#4A5568")
                       .text(`   ${reason}`, { indent: 10 });
                    doc.moveDown(0.4);
                });
            } else {
                doc.font("Helvetica").fontSize(10).fillColor("#4A5568")
                   .text("• General Violation: Non-compliance with statutory package display declarations.");
            }

            doc.moveDown(1);
            _hr(doc);
            doc.moveDown(1);

            // ── SECTION 5: SECTION 63(4) BSA CERTIFICATE ────────────────────
            doc.font("Helvetica-Bold").fontSize(11).fillColor("#1A365D")
               .text(`${sectionNum + 2}. Section 63(4) BSA Certificate — Electronic Evidence Admissibility`);
            doc.moveDown(0.5);

            // Certificate text block
            doc.font("Helvetica").fontSize(9).fillColor("#2D3748")
               .text(
                   "I, the undersigned Authorised Officer, certify that:",
                   { indent: 10 }
               );
            doc.moveDown(0.3);
            const certLines = [
                "(a) The photographic evidence embedded above was captured by the Legal " +
                    "Metrology Inspection mobile application in the ordinary course of " +
                    "official duty.",
                "(b) The Artificial Intelligence compliance evaluation was produced by a " +
                    "computer system operating in the regular course of its activities " +
                    "(Google Gemini 3.5 Flash-Lite, via the LMPC RAG Vision Service).",
                "(c) The SHA-256 cryptographic digest below was computed over a canonical " +
                    "payload comprising the AI result, per-image pixel fingerprints, GPS " +
                    "coordinates, and a Network Time Protocol (NTP) timestamp, ensuring " +
                    "the integrity and non-repudiation of this evidence package.",
                "(d) This certificate is furnished in compliance with Section 63(4) of " +
                    "the Bharatiya Sakshya Adhiniyam, 2023, and the evidence contained " +
                    "herein is presented as a valid electronic record under Section 2(1)(t) " +
                    "of the Information Technology Act, 2000."
            ];
            certLines.forEach((line) => {
                doc.font("Helvetica").fontSize(9).fillColor("#2D3748")
                   .text(line, { indent: 20, align: "justify" });
                doc.moveDown(0.3);
            });

            doc.moveDown(0.4);

            // Hash value — monospaced, prominently styled
            if (noticeData.evidenceHash) {
                doc.font("Helvetica-Bold").fontSize(9).fillColor("#1A365D")
                   .text("SHA-256 Evidence Hash:", { indent: 10 });
                doc.font("Helvetica").fontSize(8).fillColor("#2B6CB0")
                   .text(noticeData.evidenceHash, { indent: 20 });
                doc.moveDown(0.6);

                // QR code — scan to verify hash independently
                if (qrBuffer) {
                    const qrX = 50;
                    const qrY = doc.y;
                    doc.image(qrBuffer, qrX, qrY, { width: 90, height: 90 });
                    doc.font("Helvetica").fontSize(8).fillColor("#718096")
                       .text("Scan to verify hash", qrX, qrY + 92, { width: 90, align: "center" });

                    // Place supplementary text to the right of the QR code
                    doc.font("Helvetica").fontSize(8).fillColor("#4A5568")
                       .text(
                           "The QR code encodes the SHA-256 digest. Scanning this code and " +
                           "comparing it against an independent computation of the canonical " +
                           "evidence payload constitutes cryptographic verification of this " +
                           "notice under Section 63 BSA 2023.",
                           qrX + 100, qrY,
                           { width: 395, align: "justify" }
                       );

                    doc.y = qrY + 100;
                }
            }

            doc.moveDown(1.5);
            _hr(doc, "#1A365D");
            doc.moveDown(0.8);

            // ── FOOTER ───────────────────────────────────────────────────────
            doc.font("Helvetica").fontSize(8).fillColor("#718096")
               .text(
                   "This is a system-generated legal document under the Legal Metrology " +
                   "(Packaged Commodities) Rules, 2011. The SHA-256 hash embedded above " +
                   "constitutes a Section 63(4) BSA certificate and renders this document " +
                   "admissible as electronic evidence before any competent court or authority.",
                   { align: "justify" }
               );

            writeStream.on("finish", () => resolve(outputPath));
            writeStream.on("error", (err) => reject(err));
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};