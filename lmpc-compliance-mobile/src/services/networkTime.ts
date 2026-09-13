/**
 * Network Time Service
 *
 * Fetches a trusted ISO-8601 timestamp from worldtimeapi.org at the exact
 * moment the shutter fires. Using a network time source (rather than the
 * device clock) prevents timestamp manipulation and strengthens admissibility
 * of the evidence under Section 63 BSA 2023.
 *
 * Falls back to device Date.now() if the device is offline, and marks the
 * source clearly so the BSA certificate can disclose which clock was used.
 */

export interface NetworkTimestamp {
  /** ISO-8601 timestamp string */
  iso: string;
  /** "network" if from worldtimeapi.org, "device" if from Date.now() fallback */
  source: "network" | "device";
}

const NTP_URL = "https://worldtimeapi.org/api/timezone/Asia/Kolkata";
const TIMEOUT_MS = 3000;

/**
 * Returns the current timestamp. Tries worldtimeapi.org first (3 s timeout).
 * If the network call fails (offline / timeout), falls back to device clock.
 */
export const getNetworkTimestamp = async (): Promise<NetworkTimestamp> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(NTP_URL, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`NTP HTTP ${res.status}`);

    const json = await res.json();
    // worldtimeapi returns { datetime: "2026-09-13T01:24:05.123456+05:30", ... }
    const iso = json.datetime as string;
    return { iso, source: "network" };
  } catch {
    // Offline or timeout — fall back to device clock
    return { iso: new Date().toISOString(), source: "device" };
  }
};
