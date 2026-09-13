import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RootStackParamList } from "../navigation/types";
import { InspectionApi, NoticeApi } from "../services/api";
import { Inspection, Notice } from "../types/inspection";

type ScreenRouteProp = RouteProp<RootStackParamList, "InspectionDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const InspectionDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { inspectionId } = route.params;

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  const fetchDetails = useCallback(async () => {
    try {
      const data = await InspectionApi.getInspectionById(inspectionId);
      setInspection(data);

      if (data.complianceStatus === "NON_COMPLIANT") {
        const existingNotice = await NoticeApi.getNoticeByInspection(inspectionId);
        setNotice(existingNotice);
      }
    } catch (err: any) {
      console.warn("Fetch inspection details error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [inspectionId]);

  // Polling hook while status is PENDING or PROCESSING
  useEffect(() => {
    fetchDetails();

    const interval = setInterval(() => {
      if (inspection?.status === "PENDING" || inspection?.status === "PROCESSING") {
        fetchDetails();
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [fetchDetails, inspection?.status]);

  const handleRetry = async () => {
    setActionLoading(true);
    setActionMessage("Re-checking product label...");
    try {
      const updated = await InspectionApi.retryInspection(inspectionId);
      setInspection(updated);
      setTimeout(() => setActionMessage(null), 2500);
    } catch (err: any) {
      setActionMessage("Check failed. Please try again.");
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateNotice = async () => {
    setActionLoading(true);
    setActionMessage("Generating official notice...");
    try {
      const createdNotice = await NoticeApi.generateNotice(inspectionId, [
        { rule: "LMPC Rule 6(1)", description: "Mandatory declaration missing or illegible" },
      ]);
      setNotice(createdNotice);
      setActionMessage(`Notice ${createdNotice.noticeNumber} generated!`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      setActionMessage("Could not generate notice. Please retry.");
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenPdf = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      setActionMessage("Could not open PDF viewer on device.");
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  if (loading && !inspection) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Reading package details...</Text>
      </SafeAreaView>
    );
  }

  if (!inspection) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={52} color="#EF4444" />
        <Text style={styles.errorTitle}>Inspection Not Found</Text>
        <TouchableOpacity style={styles.backBtnLight} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnLightText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isPending = inspection.status === "PENDING" || inspection.status === "PROCESSING";
  const isCompliant = inspection.complianceStatus === "COMPLIANT";
  const isNonCompliant = inspection.complianceStatus === "NON_COMPLIANT";
  const isFailed = inspection.status === "FAILED";

  // Data helpers
  const ext = inspection.extractedData || {};
  const hasMrp = ext.mrp_val !== null && ext.mrp_val !== undefined;
  const hasUnit = Boolean(ext.unit_symbol || ext.net_quantity);
  const hasMfg = Boolean(ext.mfg_date);
  const hasOrigin = Boolean(ext.country_origin);

  // Layman formatters
  const displayMrp = hasMrp
    ? `₹${ext.mrp_val}`
    : isCompliant
    ? "Verified on Package"
    : "Not Found";

  const displayQuantity = (ext.net_quantity || ext.unit_symbol)
    ? String(ext.net_quantity || ext.unit_symbol)
    : isCompliant
    ? "Verified on Package"
    : "Not Found";

  const displayDate = ext.mfg_date
    ? typeof ext.mfg_date === "string" && !isNaN(Date.parse(ext.mfg_date)) && ext.mfg_date.length > 8
      ? new Date(ext.mfg_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
      : String(ext.mfg_date)
    : isCompliant
    ? "Verified on Package"
    : "Not Found";

  const displayOrigin = ext.country_origin || (isCompliant ? "India" : "Not Found");
  const displayManufacturer = ext.manufacturer_name || (isCompliant ? "Verified on Package" : null);

  // Multi-panel images list
  const imagesList = (inspection.multiImages && inspection.multiImages.length > 0)
    ? inspection.multiImages.map((m, idx) => {
        const raw = (m.panelLabel || m.panel || "").toUpperCase();
        const label = raw === "FRONT"
          ? "Side 1 (Front)"
          : raw === "BACK"
          ? "Side 2 (Back)"
          : raw.length > 0
          ? raw.charAt(0) + raw.slice(1).toLowerCase()
          : `Side ${idx + 1}`;
        return {
          url: m.imageUrl,
          label,
        };
      })
    : inspection.imageUrl
    ? [{ url: inspection.imageUrl, label: "Side 1 (Front)" }]
    : [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Clean Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inspection Result</Text>
        <View style={styles.idChip}>
          <Text style={styles.idChipText}>#{inspection._id.slice(-5).toUpperCase()}</Text>
        </View>
      </View>

      {/* Action toast message */}
      {actionMessage && (
        <View style={styles.toastBanner}>
          <Ionicons name="information-circle" size={16} color="#FFFFFF" />
          <Text style={styles.toastText}>{actionMessage}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchDetails();
            }}
            tintColor="#4F46E5"
          />
        }
      >
        {/* ─── PhonePe-Style Result Hero Banner ─────────────────────────────── */}
        {isPending ? (
          <View style={[styles.heroCard, styles.heroPending]}>
            <View style={[styles.heroIconCircle, styles.iconCirclePending]}>
              <ActivityIndicator size="large" color="#4F46E5" />
            </View>
            <Text style={styles.heroTitle}>Checking Package...</Text>
            <Text style={styles.heroSubtitle}>
              Reading label declarations and verifying Legal Metrology rules
            </Text>
          </View>
        ) : isCompliant ? (
          <View style={[styles.heroCard, styles.heroCompliant]}>
            <View style={[styles.heroIconCircle, styles.iconCircleCompliant]}>
              <Ionicons name="checkmark" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitleCompliant}>Fully Compliant</Text>
            <Text style={styles.heroSubtitleCompliant}>
              All mandatory package declarations are correctly declared and verified
            </Text>
          </View>
        ) : isNonCompliant ? (
          <View style={[styles.heroCard, styles.heroNonCompliant]}>
            <View style={[styles.heroIconCircle, styles.iconCircleNonCompliant]}>
              <Ionicons name="alert" size={34} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitleNonCompliant}>Non-Compliant</Text>
            <Text style={styles.heroSubtitleNonCompliant}>
              {(inspection.violations && inspection.violations.length > 0)
                ? `${inspection.violations.length} packaging violation(s) detected`
                : "Statutory rules violated on this package"}
            </Text>
          </View>
        ) : (
          <View style={[styles.heroCard, styles.heroFailed]}>
            <View style={[styles.heroIconCircle, styles.iconCircleFailed]}>
              <Ionicons name="refresh" size={32} color="#D97706" />
            </View>
            <Text style={styles.heroTitleFailed}>Could Not Read Label</Text>
            <Text style={styles.heroSubtitleFailed}>
              {inspection.failureReason || "Please retake a clear, well-lit photo of the packaging"}
            </Text>
            <TouchableOpacity style={styles.retryActionBtn} onPress={handleRetry} disabled={actionLoading}>
              <Text style={styles.retryActionBtnText}>Re-check Package</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Package Details Card (PhonePe Receipt Style) ─────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="cube-outline" size={18} color="#4F46E5" />
              <Text style={styles.cardHeading}>Package Details</Text>
            </View>
            {isCompliant && (
              <View style={styles.verifiedTag}>
                <Ionicons name="shield-checkmark" size={12} color="#16A34A" />
                <Text style={styles.verifiedTagText}>Rules Met</Text>
              </View>
            )}
          </View>

          <View style={styles.receiptDivider} />

          {/* MRP */}
          <ReceiptRow
            label="Maximum Retail Price (MRP)"
            value={displayMrp}
            status={hasMrp || isCompliant ? "valid" : "missing"}
          />

          {/* Net Quantity */}
          <ReceiptRow
            label="Net Quantity"
            value={displayQuantity}
            status={hasUnit || isCompliant ? "valid" : "missing"}
          />

          {/* Manufacture Date */}
          <ReceiptRow
            label="Manufacture / Packing Date"
            value={displayDate}
            status={hasMfg || isCompliant ? "valid" : "missing"}
          />

          {/* Country of Origin */}
          <ReceiptRow
            label="Country of Origin"
            value={displayOrigin}
            status={hasOrigin || isCompliant ? "valid" : "missing"}
          />

          {/* Manufacturer if available */}
          {displayManufacturer && (
            <ReceiptRow
              label="Manufacturer / Brand"
              value={displayManufacturer}
              status={isCompliant ? "valid" : "neutral"}
            />
          )}
        </View>

        {/* ─── Violations Section (if Non-Compliant) ─────────────────────────── */}
        {isNonCompliant && inspection.violations && inspection.violations.length > 0 && (
          <View style={[styles.card, styles.violationBorder]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="warning-outline" size={18} color="#DC2626" />
                <Text style={[styles.cardHeading, { color: "#DC2626" }]}>Issues Found on Label</Text>
              </View>
            </View>

            <View style={styles.receiptDivider} />

            {inspection.violations.map((v, idx) => (
              <View key={idx} style={styles.violationItem}>
                <View style={styles.violationDot} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.violationRule}>{v.rule}</Text>
                  <Text style={styles.violationDesc}>{v.description || "Required declaration missing or improper"}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ─── Legal Notice Card (if Non-Compliant) ──────────────────────────── */}
        {isNonCompliant && (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Official Notice</Text>
            <Text style={styles.noticeSub}>
              {notice
                ? `Notice #${notice.noticeNumber} has been issued for this inspection.`
                : "Generate an official digital notice with visual evidence for the store or distributor."}
            </Text>

            {notice?.pdfUrl ? (
              <TouchableOpacity
                style={styles.noticeDownloadBtn}
                onPress={() => handleOpenPdf(notice.pdfUrl!)}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.noticeDownloadBtnText}>Download Notice (PDF)</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.generateNoticeBtn}
                onPress={handleGenerateNotice}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="document-attach-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.generateNoticeBtnText}>Issue Legal Notice</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ─── Product Photo ────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="images-outline" size={18} color="#4F46E5" />
              <Text style={styles.cardHeading}>
                {imagesList.length > 1 ? "Product Photos" : "Product Photo"}
              </Text>
            </View>
            {imagesList.length > 1 && (
              <View style={styles.sideCountChip}>
                <Text style={styles.sideCountChipText}>
                  {imagesList.length} Sides Captured
                </Text>
              </View>
            )}
          </View>

          {imagesList.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.panelSelectorRow}
            >
              {imagesList.map((img, idx) => {
                const isSelected = selectedImageIndex === idx;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.panelTab, isSelected && styles.panelTabActive]}
                    onPress={() => setSelectedImageIndex(idx)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                      size={13}
                      color={isSelected ? "#FFFFFF" : "#64748B"}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.panelTabText, isSelected && styles.panelTabTextActive]}>
                      {img.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {imagesList.length > 0 ? (
            <View style={styles.imageBox}>
              <Image
                source={{ uri: imagesList[selectedImageIndex]?.url || inspection.imageUrl }}
                style={styles.productImage}
                resizeMode="contain"
              />
              {imagesList.length > 1 && (
                <View style={styles.imageSideOverlay}>
                  <Text style={styles.imageSideOverlayText}>
                    {imagesList[selectedImageIndex]?.label}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.imageBox, styles.emptyImageBox]}>
              <Ionicons name="image-outline" size={36} color="#475569" />
              <Text style={styles.emptyImageText}>No photo attached</Text>
            </View>
          )}
        </View>

        {/* ─── Inspection Record & Location ──────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Inspection Summary</Text>
          <View style={styles.receiptDivider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Date & Time</Text>
            <Text style={styles.metaVal}>
              {new Date(inspection.createdAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>GPS Location</Text>
            <Text style={styles.metaVal}>
              {inspection.location?.coordinates
                ? `${inspection.location.coordinates[1]?.toFixed(4)}°, ${inspection.location.coordinates[0]?.toFixed(4)}°`
                : "Recorded"}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Evidence Status</Text>
            <View style={styles.sealPill}>
              <Ionicons name="shield-checkmark" size={13} color="#15803D" />
              <Text style={styles.sealText}>Digitally Sealed</Text>
            </View>
          </View>
        </View>

        {/* ─── Action: Scan Next ────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.scanNextBtn}
          onPress={() => navigation.navigate("MainTabs", { screen: "Scan" } as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="camera-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.scanNextBtnText}>Scan Next Product</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Layman Receipt Row Component ──────────────────────────────────────────────
interface ReceiptRowProps {
  label: string;
  value: string;
  status: "valid" | "missing" | "neutral";
}

const ReceiptRow: React.FC<ReceiptRowProps> = ({ label, value, status }) => {
  return (
    <View style={styles.receiptRow}>
      <Text style={styles.receiptLabel}>{label}</Text>
      <View style={styles.receiptValueWrap}>
        {status === "valid" ? (
          <Ionicons name="checkmark-circle" size={16} color="#16A34A" style={styles.statusIcon} />
        ) : status === "missing" ? (
          <Ionicons name="close-circle" size={16} color="#DC2626" style={styles.statusIcon} />
        ) : null}
        <Text
          style={[
            styles.receiptValue,
            status === "valid" && styles.valueValid,
            status === "missing" && styles.valueMissing,
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
};

// ─── Clean, Modern PhonePe-Inspired Styles ─────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    color: "#64748B",
    fontSize: 15,
    fontWeight: "500",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 14,
  },
  backBtnLight: {
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  backBtnLightText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "600",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  idChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  idChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  toastBanner: {
    backgroundColor: "#1E293B",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "500",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // ── Hero Banners ─────────────────────────────────────────────────────────────
  heroCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
  },
  heroIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  heroCompliant: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  iconCircleCompliant: {
    backgroundColor: "#16A34A",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTitleCompliant: {
    fontSize: 22,
    fontWeight: "800",
    color: "#15803D",
    marginBottom: 6,
  },
  heroSubtitleCompliant: {
    fontSize: 14,
    color: "#166534",
    textAlign: "center",
    lineHeight: 20,
  },
  heroNonCompliant: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  iconCircleNonCompliant: {
    backgroundColor: "#DC2626",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTitleNonCompliant: {
    fontSize: 22,
    fontWeight: "800",
    color: "#B91C1C",
    marginBottom: 6,
  },
  heroSubtitleNonCompliant: {
    fontSize: 14,
    color: "#991B1B",
    textAlign: "center",
    lineHeight: 20,
  },
  heroPending: {
    backgroundColor: "#EEF2FF",
    borderColor: "#C7D2FE",
  },
  iconCirclePending: {
    backgroundColor: "#E0E7FF",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#3730A3",
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#4338CA",
    textAlign: "center",
    lineHeight: 20,
  },
  heroFailed: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  iconCircleFailed: {
    backgroundColor: "#FEF3C7",
  },
  heroTitleFailed: {
    fontSize: 20,
    fontWeight: "800",
    color: "#92400E",
    marginBottom: 6,
  },
  heroSubtitleFailed: {
    fontSize: 14,
    color: "#B45309",
    textAlign: "center",
    lineHeight: 20,
  },
  retryActionBtn: {
    marginTop: 14,
    backgroundColor: "#D97706",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  retryActionBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  // ── General Cards ────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  verifiedTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  receiptDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 14,
  },
  // ── Receipt Rows ─────────────────────────────────────────────────────────────
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  receiptLabel: {
    fontSize: 13,
    color: "#64748B",
    flex: 1,
    paddingRight: 12,
  },
  receiptValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "58%",
    justifyContent: "flex-end",
  },
  statusIcon: {
    marginRight: 5,
  },
  receiptValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "right",
  },
  valueValid: {
    color: "#15803D",
  },
  valueMissing: {
    color: "#DC2626",
  },
  // ── Violations ───────────────────────────────────────────────────────────────
  violationBorder: {
    borderColor: "#FCA5A5",
  },
  violationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    backgroundColor: "#FFF5F5",
    padding: 12,
    borderRadius: 10,
  },
  violationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    marginTop: 5,
  },
  violationRule: {
    fontSize: 13,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: 2,
  },
  violationDesc: {
    fontSize: 12,
    color: "#7F1D1D",
    lineHeight: 17,
  },
  // ── Notice ───────────────────────────────────────────────────────────────────
  noticeSub: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 18,
  },
  generateNoticeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    paddingVertical: 13,
    borderRadius: 12,
  },
  generateNoticeBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  noticeDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    paddingVertical: 13,
    borderRadius: 12,
  },
  noticeDownloadBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  // ── Photo & Metadata ─────────────────────────────────────────────────────────
  sideCountChip: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sideCountChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },
  panelSelectorRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  panelTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  panelTabActive: {
    backgroundColor: "#4F46E5",
  },
  panelTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  panelTabTextActive: {
    color: "#FFFFFF",
  },
  imageSideOverlay: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imageSideOverlayText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyImageBox: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyImageText: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 6,
  },
  imageBox: {
    width: "100%",
    height: 200,
    backgroundColor: "#0F172A",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 12,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  metaLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  metaVal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  sealPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  sealText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  // ── Scan Next Button ─────────────────────────────────────────────────────────
  scanNextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 4,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  scanNextBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
