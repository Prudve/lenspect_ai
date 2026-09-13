/**
 * OfflineContext — Offline-First Synchronization Queue
 *
 * Architecture:
 *  • All inspection uploads are routed through this context.
 *  • If the POST fails (network error / timeout), the compressed image is
 *    persisted to expo-file-system's document directory and metadata is saved
 *    to AsyncStorage. The item status becomes "PENDING".
 *  • NetInfo listens for network restoration. When 4G/Wi-Fi is detected,
 *    syncQueue() fires automatically.
 *  • Sync processes items in BATCHES OF 3 (concurrent Promise.all) to avoid
 *    overwhelming the Express server with too many simultaneous multipart
 *    uploads, while still being faster than sequential processing.
 *  • pendingCount (queue items with status "PENDING" or "FAILED") is exposed
 *    for the "Pending Sync" badge in the UI.
 */

import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import * as FileSystem from "expo-file-system";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { InspectionApi } from "../services/api";
import { StorageService } from "../services/storage";
import { OfflineInspectionItem } from "../types/queue";

// ── Batch size ────────────────────────────────────────────────────────────────
const SYNC_BATCH_SIZE = 3;

interface OfflineContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  queue: OfflineInspectionItem[];
  /** Number of items awaiting upload — use for the "Pending Sync" badge */
  pendingCount: number;
  enqueueInspection: (item: {
    imageUri?: string;
    imageUris?: string[];
    latitude: number;
    longitude: number;
    networkTimestamp: string;
    timestampSource: "network" | "device";
    merchantName?: string;
    notes?: string;
  }) => Promise<void>;
  syncQueue: () => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearQueue: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [queue, setQueue] = useState<OfflineInspectionItem[]>([]);
  const isSyncingRef = useRef<boolean>(false);

  // Derived: items the user is still waiting on
  const pendingCount = queue.filter(
    (item) => item.status === "PENDING" || item.status === "FAILED"
  ).length;

  // Initialize queue from disk on mount
  useEffect(() => {
    StorageService.getOfflineQueue().then(setQueue);
  }, []);

  // ── Persist + update state atomically ────────────────────────────────────────
  const saveAndSetQueue = async (newQueue: OfflineInspectionItem[]) => {
    setQueue(newQueue);
    await StorageService.saveOfflineQueue(newQueue);
  };

  // ── Network monitor — trigger sync on restoration ─────────────────────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);

      // Auto-sync when connection is restored (4G / Wi-Fi)
      if (online && !isSyncingRef.current) {
        syncQueue();
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Enqueue ───────────────────────────────────────────────────────────────
  const enqueueInspection = async (item: {
    imageUri?: string;
    imageUris?: string[];
    latitude: number;
    longitude: number;
    networkTimestamp: string;
    timestampSource: "network" | "device";
    merchantName?: string;
    notes?: string;
  }) => {
    const id = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const uris = item.imageUris && item.imageUris.length > 0 ? item.imageUris : item.imageUri ? [item.imageUri] : [];

    // Copy all photos to persistent document directory
    const persistentUris: string[] = [];
    for (let i = 0; i < uris.length; i++) {
      const src = uris[i];
      let dest = src;
      try {
        if (FileSystem.documentDirectory) {
          dest = `${FileSystem.documentDirectory}${id}_${i}.jpg`;
          await FileSystem.copyAsync({ from: src, to: dest });
        }
      } catch (err) {
        console.warn("Could not copy photo to documents dir, using original URI:", err);
      }
      persistentUris.push(dest);
    }

    const newItem: OfflineInspectionItem = {
      id,
      localImageUri: persistentUris[0] || item.imageUri || "",
      localImageUris: persistentUris,
      latitude: item.latitude,
      longitude: item.longitude,
      networkTimestamp: item.networkTimestamp,
      timestampSource: item.timestampSource,
      merchantName: item.merchantName,
      notes: item.notes,
      timestamp: Date.now(),
      status: "PENDING",
      attempts: 0,
    };

    const updated = [newItem, ...queue];
    await saveAndSetQueue(updated);

    // If online, immediately attempt upload (small delay to let React commit state)
    if (isOnline && !isSyncingRef.current) {
      setTimeout(() => syncQueue(), 500);
    }
  };

  // ── Batch Sync ────────────────────────────────────────────────────────────
  const syncQueue = useCallback(async () => {
    const currentQueue = await StorageService.getOfflineQueue();
    const pendingItems = currentQueue.filter((item) => item.status === "PENDING");

    if (pendingItems.length === 0 || isSyncingRef.current) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    // Work on a mutable copy; save to disk after each batch
    let workingQueue = [...currentQueue];

    /**
     * Process a single item and mutate workingQueue in place.
     * Returns the updated queue.
     */
    const processItem = async (item: OfflineInspectionItem): Promise<void> => {
      const idx = workingQueue.findIndex((q) => q.id === item.id);
      if (idx === -1) return;

      // Mark as syncing
      workingQueue[idx] = { ...workingQueue[idx], status: "SYNCING" };

      try {
        if (item.localImageUris && item.localImageUris.length > 1) {
          await InspectionApi.uploadMultiScan({
            imageUris: item.localImageUris,
            latitude: item.latitude,
            longitude: item.longitude,
          });
        } else {
          await InspectionApi.uploadScan({
            imageUri: item.localImageUri,
            latitude: item.latitude,
            longitude: item.longitude,
          });
        }

        // Success: delete local files and remove from queue
        const filesToDelete = item.localImageUris && item.localImageUris.length > 0 ? item.localImageUris : [item.localImageUri];
        for (const uri of filesToDelete) {
          if (uri && uri.startsWith(FileSystem.documentDirectory || "")) {
            await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
          }
        }
        workingQueue = workingQueue.filter((q) => q.id !== item.id);
      } catch (err: any) {
        const i = workingQueue.findIndex((q) => q.id === item.id);
        if (i !== -1) {
          workingQueue[i] = {
            ...workingQueue[i],
            status: "FAILED",
            attempts: workingQueue[i].attempts + 1,
            errorMessage: err?.response?.data?.message || err?.message || "Sync failed",
          };
        }
      }
    };

    // ── Chunk pendingItems into batches of SYNC_BATCH_SIZE ────────────────
    for (let i = 0; i < pendingItems.length; i += SYNC_BATCH_SIZE) {
      const batch = pendingItems.slice(i, i + SYNC_BATCH_SIZE);

      // Upload the batch concurrently
      await Promise.all(batch.map((item) => processItem(item)));

      // Persist after every batch so partial progress survives a crash
      await saveAndSetQueue([...workingQueue]);
    }

    setIsSyncing(false);
    isSyncingRef.current = false;
  }, []);

  // ── Remove a single item ──────────────────────────────────────────────────
  const removeItem = async (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (item?.localImageUri?.startsWith(FileSystem.documentDirectory || "")) {
      await FileSystem.deleteAsync(item.localImageUri, { idempotent: true }).catch(() => {});
    }
    await saveAndSetQueue(queue.filter((q) => q.id !== id));
  };

  // ── Clear all queued items ────────────────────────────────────────────────
  const clearQueue = async () => {
    for (const item of queue) {
      if (item.localImageUri?.startsWith(FileSystem.documentDirectory || "")) {
        await FileSystem.deleteAsync(item.localImageUri, { idempotent: true }).catch(() => {});
      }
    }
    await saveAndSetQueue([]);
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isSyncing,
        queue,
        pendingCount,
        enqueueInspection,
        syncQueue,
        removeItem,
        clearQueue,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = (): OfflineContextValue => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return context;
};

