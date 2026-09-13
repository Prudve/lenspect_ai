import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useOffline } from "../context/OfflineContext";
import { OfflineInspectionItem } from "../types/queue";

export const OfflineQueueScreen: React.FC = () => {
  const { isOnline, isSyncing, queue, syncQueue, removeItem, clearQueue } = useOffline();

  const handleClear = () => {
    Alert.alert("Clear Offline Queue", "Are you sure you want to discard all un-synced scans?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear All", style: "destructive", onPress: clearQueue },
    ]);
  };

  const renderQueueItem = ({ item }: { item: OfflineInspectionItem }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.localImageUri }} style={styles.thumbnail} />

      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemDate}>
            {new Date(item.timestamp).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </Text>
          <View
            style={[
              styles.statusBadge,
              item.status === "SYNCING"
                ? styles.badgeSyncing
                : item.status === "FAILED"
                ? styles.badgeFailed
                : styles.badgePending,
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        {item.merchantName ? (
          <Text style={styles.merchantText}>🏬 {item.merchantName}</Text>
        ) : null}

        <Text style={styles.coordsText}>
          📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
        </Text>

        {item.errorMessage && (
          <Text style={styles.errorText}>⚠️ {item.errorMessage}</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => removeItem(item.id)}
        disabled={item.status === "SYNCING"}
      >
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Saved Scans</Text>
          <Text style={styles.headerSubtitle}>
            {queue.length} scan(s) saved on this device
          </Text>
        </View>

        {queue.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Network Status Strip */}
      <View style={[styles.networkStrip, isOnline ? styles.onlineStrip : styles.offlineStrip]}>
        <Ionicons
          name={isOnline ? "wifi" : "wifi-outline"}
          size={16}
          color={isOnline ? "#15803D" : "#B91C1C"}
        />
        <Text style={[styles.networkText, { color: isOnline ? "#15803D" : "#B91C1C" }]}>
          {isOnline
            ? "Connected: Ready to sync saved scans"
            : "Offline: Scans are saved securely on device"}
        </Text>
      </View>

      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        renderItem={renderQueueItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cloud-done-outline" size={48} color="#16A34A" />
            <Text style={styles.emptyTitle}>All Scans Uploaded</Text>
            <Text style={styles.emptyDesc}>
              No pending scans waiting on this device.
            </Text>
          </View>
        }
      />

      {queue.length > 0 && isOnline && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.syncBtn}
            onPress={syncQueue}
            disabled={isSyncing}
            activeOpacity={0.85}
          >
            {isSyncing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="sync" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.syncBtnText}>Sync All Scans Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  clearBtn: {
    padding: 6,
  },
  clearBtnText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
  },
  networkStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    marginVertical: 8,
    gap: 8,
  },
  onlineStrip: {
    backgroundColor: "#DCFCE7",
  },
  offlineStrip: {
    backgroundColor: "#FEE2E2",
  },
  networkText: {
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "#0F172A",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePending: {
    backgroundColor: "#FEF3C7",
  },
  badgeSyncing: {
    backgroundColor: "#DBEAFE",
  },
  badgeFailed: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#1E293B",
  },
  merchantText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 2,
  },
  coordsText: {
    fontSize: 11,
    color: "#475569",
  },
  errorText: {
    fontSize: 10,
    color: "#DC2626",
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 80,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  syncBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  syncBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
