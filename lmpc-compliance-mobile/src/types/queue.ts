export type QueueItemStatus = "PENDING" | "SYNCING" | "FAILED";

export interface OfflineInspectionItem {
  id: string;
  localImageUri: string;
  localImageUris?: string[];
  latitude: number;
  longitude: number;
  merchantName?: string;
  notes?: string;
  /** ISO-8601 timestamp captured at shutter-fire (network or device clock) */
  networkTimestamp: string;
  /** Source of the timestamp — "network" | "device" */
  timestampSource: "network" | "device";
  timestamp: number;
  status: QueueItemStatus;
  errorMessage?: string;
  attempts: number;
}
