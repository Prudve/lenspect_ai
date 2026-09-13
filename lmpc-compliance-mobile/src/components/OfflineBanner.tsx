import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useOffline } from "../context/OfflineContext";

export const OfflineBanner: React.FC = () => {
  const { isOnline, isSyncing, queue, syncQueue } = useOffline();

  const pendingCount = queue.filter((q) => q.status !== "SYNCING").length;

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <View style={[styles.container, !isOnline ? styles.offlineBg : styles.syncBg]}>
      <View style={styles.leftContent}>
        <Ionicons
          name={!isOnline ? "cloud-offline" : "cloud-upload"}
          size={16}
          color={!isOnline ? "#92400E" : "#1E40AF"}
          style={styles.icon}
        />
        <Text style={[styles.bannerText, !isOnline ? styles.textOffline : styles.textSync]}>
          {!isOnline
            ? pendingCount > 0
              ? `Offline: ${pendingCount} scan(s) saved on device`
              : "Offline: Scans will save to device"
            : isSyncing
            ? "Syncing scans to server..."
            : `${pendingCount} saved scan(s) ready to upload`}
        </Text>
      </View>

      {isOnline && pendingCount > 0 && (
        <TouchableOpacity style={styles.syncBtn} onPress={syncQueue} disabled={isSyncing}>
          {isSyncing ? (
            <ActivityIndicator size="small" color="#1E40AF" />
          ) : (
            <Text style={styles.syncBtnText}>Sync Now</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  offlineBg: {
    backgroundColor: "#FEF3C7",
    borderBottomColor: "#FDE68A",
  },
  syncBg: {
    backgroundColor: "#EFF6FF",
    borderBottomColor: "#BFDBFE",
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: "600",
  },
  textOffline: {
    color: "#92400E",
  },
  textSync: {
    color: "#1E40AF",
  },
  syncBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  syncBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
