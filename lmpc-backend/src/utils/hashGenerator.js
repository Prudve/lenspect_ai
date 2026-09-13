import crypto from "crypto";

/**
 * Generates a cryptographic SHA-256 evidence hash for admissibility under
 * Section 63 of the Bharatiya Sakshya Adhiniyam (BSA), 2023.
 *
 * Section 63 recognises electronic records as admissible evidence provided
 * the output was produced by a computer in the regular course of its activities
 * and a certificate identifying the output and describing the manner of its
 * production is furnished. The SHA-256 hash serves as that tamper-evident fingerprint.
 *
 * Canonical payload (JSON-stringified, top-level keys sorted for determinism):
 * {
 *   ai_result    : ComplianceResult JSON (violations, USP audit, etc.)
 *   gps          : { latitude, longitude }
 *   image_hashes : string[]  — SHA-256 of each raw Base64 image buffer
 *   network_ts   : ISO-8601 timestamp (NTP-sourced, not device clock)
 * }
 *
 * @param {Object}   aiResult          - The ComplianceResult JSON object from Gemini
 * @param {string[]} imageBase64Arr    - Base64-encoded image strings (one per panel)
 * @param {{ latitude: number, longitude: number }} gps - Inspection GPS coordinates
 * @param {string}   networkTimestamp  - ISO-8601 NTP timestamp
 *
 * @returns {{ hash: string, canonicalPayload: Object }}
 *   hash             : Hex SHA-256 digest — store this immutably in MongoDB
 *   canonicalPayload : The exact object that was hashed — embed in the BSA certificate
 */
export const generateEvidenceHash = (aiResult, imageBase64Arr, gps, networkTimestamp) => {
    // 1. Compute a SHA-256 fingerprint for each image so the certificate binds
    //    to the exact pixel data captured at the scene.
    const imageHashes = imageBase64Arr.map((b64) =>
        crypto.createHash("sha256").update(b64, "base64").digest("hex")
    );

    // 2. Build the canonical payload — top-level keys sorted for determinism.
    //    Any downstream re-verification must sort keys identically.
    const canonicalPayload = {
        ai_result: aiResult,
        gps: {
            latitude: gps.latitude,
            longitude: gps.longitude
        },
        image_hashes: imageHashes,
        network_ts: networkTimestamp
    };

    // 3. Stringify with sorted top-level keys → identical output on re-verification
    const sortedKeys = Object.keys(canonicalPayload).sort();
    const canonicalString = JSON.stringify(canonicalPayload, sortedKeys);

    // 4. Compute the final SHA-256 digest
    const hash = crypto.createHash("sha256").update(canonicalString, "utf8").digest("hex");

    return { hash, canonicalPayload };
};
