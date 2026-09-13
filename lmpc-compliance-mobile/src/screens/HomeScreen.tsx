import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ComplianceStatusBadge } from "../components/ComplianceStatusBadge";
import { OfflineBanner } from "../components/OfflineBanner";
import { useAuth } from "../context/AuthContext";
import { useOffline } from "../context/OfflineContext";
import { RootStackParamList } from "../navigation/types";
import { AnalyticsApi, InspectionApi } from "../services/api";
import { ComplianceRateData, Inspection, InspectionStatsSummary } from "../types/inspection";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { isOnline, pendingCount } = useOffline();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [stats, setStats] = useState<InspectionStatsSummary | null>(null);
  const [complianceRate, setComplianceRate] = useState<ComplianceRateData | null>(null);
  const [recentInspections, setRecentInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, rateRes, recentRes] = await Promise.allSettled([
        InspectionApi.getStatsSummary(),
        AnalyticsApi.getComplianceRate(),
        InspectionApi.getMyInspections({ limit: 5 }),
      ]);

      if (statsRes.status === "fulfilled") setStats(statsRes.value);
      if (rateRes.status === "fulfilled") setComplianceRate(rateRes.value);
      if (recentRes.status === "fulfilled") setRecentInspections(recentRes.value.inspections);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const rateValue =
    complianceRate?.complianceRate ??
    (stats?.total
      ? Math.round(((stats.byCompliance?.COMPLIANT || 0) / stats.total) * 100)
      : 85);

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
      >
        {/* Top Header Row */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.statusIndicatorRow}>
              <View style={[styles.networkDot, { backgroundColor: isOnline ? "#16A34A" : "#D97706" }]} />
              <Text style={styles.networkStatusText}>
                {isOnline ? "Online" : "Offline"}
              </Text>
            </View>
            <Text style={styles.officerName}>Hello, {user?.fullName || "Inspector"}</Text>
            <Text style={styles.jurisdictionText}>Legal Metrology Inspection</Text>
          </View>

          {pendingCount > 0 && (
            <TouchableOpacity
              style={styles.pendingBadge}
              onPress={() => (navigation as any).navigate("Queue")}
              activeOpacity={0.8}
            >
              <Ionicons name="cloud-upload-outline" size={14} color="#D97706" />
              <Text style={styles.pendingBadgeText}>{pendingCount} Saved</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Primary Action Card: Scan Product (PhonePe Style) */}
        <TouchableOpacity
          style={styles.heroCard}
          onPress={() => (navigation as any).navigate("Scan")}
          activeOpacity={0.88}
        >
          <View style={styles.heroLeft}>
            <View style={styles.shutterIconCircle}>
              <Ionicons name="scan" size={26} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.heroTitle}>Scan Product</Text>
              <Text style={styles.heroDesc}>
                Point camera to check price, net weight, and mandatory label details
              </Text>
            </View>
          </View>
          <View style={styles.heroArrow}>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </View>
        </TouchableOpacity>

        {/* Overview Stats Card */}
        <View style={styles.metricsCard}>
          <View style={styles.metricsHeader}>
            <View>
              <Text style={styles.metricsTitle}>Inspection Summary</Text>
              <Text style={styles.metricsSubtitle}>Overall Compliance Rate</Text>
            </View>
            <View style={styles.rateBadge}>
              <Text style={styles.rateBadgeValue}>{rateValue}%</Text>
              <Text style={styles.rateBadgeLabel}>Compliant</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${Math.min(rateValue, 100)}%` }]} />
          </View>

          {/* 4 Stat Columns */}
          <View style={styles.statsGrid}>
            <View style={styles.statColumn}>
              <Text style={styles.statNumber}>{stats?.total || 0}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />

            <View style={styles.statColumn}>
              <Text style={[styles.statNumber, { color: "#16A34A" }]}>
                {stats?.byCompliance?.COMPLIANT || 0}
              </Text>
              <Text style={styles.statLabel}>Compliant</Text>
            </View>
            <View style={styles.statDivider} />

            <View style={styles.statColumn}>
              <Text style={[styles.statNumber, { color: "#DC2626" }]}>
                {stats?.byCompliance?.NON_COMPLIANT || 0}
              </Text>
              <Text style={styles.statLabel}>Violations</Text>
            </View>
            <View style={styles.statDivider} />

            <View style={styles.statColumn}>
              <Text style={[styles.statNumber, { color: "#D97706" }]}>
                {stats?.byCompliance?.NEEDS_REVIEW || 0}
              </Text>
              <Text style={styles.statLabel}>Review</Text>
            </View>
          </View>
        </View>

        {/* Recent Inspections Feed */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Scans</Text>
          <TouchableOpacity onPress={() => (navigation as any).navigate("History")} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#4F46E5" style={{ marginVertical: 24 }} />
        ) : recentInspections.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={32} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Scans Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the Scan Product button above to start your first inspection.
            </Text>
          </View>
        ) : (
          recentInspections.map((item) => {
            const isCompliantItem = item.complianceStatus === "COMPLIANT";
            const isViolation = item.complianceStatus === "NON_COMPLIANT";
            return (
              <TouchableOpacity
                key={item._id}
                style={styles.inspectionRow}
                onPress={() => navigation.navigate("InspectionDetail", { inspectionId: item._id })}
                activeOpacity={0.7}
              >
                <View style={styles.inspectionLeft}>
                  <View style={[styles.packageIconBadge, isCompliantItem ? styles.iconBadgeGreen : isViolation ? styles.iconBadgeRed : null]}>
                    <Ionicons
                      name={isCompliantItem ? "checkmark-circle" : isViolation ? "alert-circle" : "cube-outline"}
                      size={20}
                      color={isCompliantItem ? "#16A34A" : isViolation ? "#DC2626" : "#64748B"}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.inspectionTitle}>
                      {item.extractedData?.mrp_val
                        ? `Package (₹${item.extractedData.mrp_val})`
                        : "Packaged Product"}
                    </Text>
                    <Text style={styles.inspectionMeta}>
                      {new Date(item.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>

                <ComplianceStatusBadge status={item.complianceStatus} size="small" />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  statusIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  networkDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  networkStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  officerName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  jurisdictionText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 1,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
  },
  heroCard: {
    backgroundColor: "#4F46E5",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  heroLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  shutterIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  heroDesc: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.82)",
    lineHeight: 16,
  },
  heroArrow: {
    marginLeft: 10,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  metricsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  metricsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  metricsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  metricsSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  rateBadge: {
    alignItems: "flex-end",
  },
  rateBadgeValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#16A34A",
  },
  rateBadgeLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#16A34A",
    borderRadius: 3,
  },
  statsGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statColumn: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E8F0",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4F46E5",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  inspectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  inspectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  packageIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  iconBadgeGreen: {
    backgroundColor: "#DCFCE7",
  },
  iconBadgeRed: {
    backgroundColor: "#FEE2E2",
  },
  inspectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  inspectionMeta: {
    fontSize: 11,
    color: "#64748B",
  },
});
