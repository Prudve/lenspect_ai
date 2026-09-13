import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ComplianceStatusBadge, PipelineStatusBadge } from "../components/ComplianceStatusBadge";
import { RootStackParamList } from "../navigation/types";
import { InspectionApi } from "../services/api";
import { ComplianceStatus, Inspection } from "../types/inspection";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterType = "ALL" | ComplianceStatus;

export const InspectionsListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [filter, setFilter] = useState<FilterType>("ALL");
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchInspections = useCallback(
    async (pageNum: number, shouldReset = false) => {
      if (loading) return;
      setLoading(true);

      try {
        const complianceFilter = filter === "ALL" ? undefined : filter;
        const result = await InspectionApi.getMyInspections({
          page: pageNum,
          limit: 10,
          complianceStatus: complianceFilter,
        });

        if (shouldReset) {
          setInspections(result.inspections);
        } else {
          setInspections((prev) => [...prev, ...result.inspections]);
        }

        setHasMore(pageNum < result.pages);
        setPage(pageNum);
      } catch (err) {
        console.warn("Failed to load inspections:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    fetchInspections(1, true);
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInspections(1, true);
  };

  const onEndReached = () => {
    if (hasMore && !loading) {
      fetchInspections(page + 1, false);
    }
  };

  const renderFilterTab = (tab: FilterType, label: string) => {
    const isSelected = filter === tab;
    return (
      <TouchableOpacity
        key={tab}
        style={[styles.filterChip, isSelected && styles.filterChipSelected]}
        onPress={() => setFilter(tab)}
      >
        <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderInspectionItem = ({ item }: { item: Inspection }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("InspectionDetail", { inspectionId: item._id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardTop}>
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
        <PipelineStatusBadge status={item.status} size="small" />
      </View>

      <View style={styles.cardMid}>
        <ComplianceStatusBadge status={item.complianceStatus} size="small" />
        {item.extractedData?.mrp_val && (
          <Text style={styles.mrpText}>₹{item.extractedData.mrp_val}</Text>
        )}
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.locationText}>
          📍 {item.location?.coordinates?.[1]?.toFixed(4)}, {item.location?.coordinates?.[0]?.toFixed(4)}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Past Inspections</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {renderFilterTab("ALL", "All Scans")}
        {renderFilterTab("COMPLIANT", "Compliant")}
        {renderFilterTab("NON_COMPLIANT", "Violations")}
        {renderFilterTab("NEEDS_REVIEW", "Review")}
      </View>

      <FlatList
        data={inspections}
        keyExtractor={(item) => item._id}
        renderItem={renderInspectionItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loading && !refreshing ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color="#2563EB" />
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Records Found</Text>
              <Text style={styles.emptyDesc}>
                No scans match the selected "{filter}" filter.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
  },
  filterChipSelected: {
    backgroundColor: "#1E3A8A",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  filterTextSelected: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dateText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  cardMid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  mrpText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#059669",
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
  },
  locationText: {
    fontSize: 12,
    color: "#475569",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#475569",
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
  },
});
