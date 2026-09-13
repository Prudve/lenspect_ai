import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ComplianceStatus, InspectionStatus } from "../types/inspection";

interface ComplianceBadgeProps {
  status: ComplianceStatus;
  size?: "small" | "medium" | "large";
}

export const ComplianceStatusBadge: React.FC<ComplianceBadgeProps> = ({ status, size = "medium" }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case "COMPLIANT":
        return {
          bg: "#DCFCE7",
          text: "#15803D",
          border: "#86EFAC",
          icon: "checkmark-circle" as const,
          label: "LMPC COMPLIANT",
        };
      case "NON_COMPLIANT":
        return {
          bg: "#FEE2E2",
          text: "#B91C1C",
          border: "#FCA5A5",
          icon: "alert-circle" as const,
          label: "VIOLATION FLAGGED",
        };
      case "NEEDS_REVIEW":
      default:
        return {
          bg: "#FEF3C7",
          text: "#B45309",
          border: "#FDE68A",
          icon: "help-circle" as const,
          label: "NEEDS REVIEW",
        };
    }
  };

  const config = getBadgeConfig();
  const isSmall = size === "small";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          paddingVertical: isSmall ? 3 : 5,
          paddingHorizontal: isSmall ? 7 : 10,
        },
      ]}
    >
      <Ionicons name={config.icon} size={isSmall ? 12 : 15} color={config.text} style={styles.icon} />
      <Text style={[styles.text, { color: config.text, fontSize: isSmall ? 11 : 12 }]}>{config.label}</Text>
    </View>
  );
};

interface PipelineBadgeProps {
  status: InspectionStatus;
  size?: "small" | "medium";
}

export const PipelineStatusBadge: React.FC<PipelineBadgeProps> = ({ status, size = "small" }) => {
  const getConfig = () => {
    switch (status) {
      case "PENDING":
        return { bg: "#F1F5F9", text: "#475569", label: "QUEUED (BullMQ)" };
      case "PROCESSING":
        return { bg: "#DBEAFE", text: "#1D4ED8", label: "ANALYZING (CV/OCR)" };
      case "COMPLETED":
        return { bg: "#DCFCE7", text: "#15803D", label: "COMPLETED" };
      case "FAILED":
        return { bg: "#FEE2E2", text: "#B91C1C", label: "FAILED" };
      default:
        return { bg: "#F1F5F9", text: "#475569", label: status };
    }
  };

  const config = getConfig();
  const isSmall = size === "small";

  return (
    <View style={[styles.pill, { backgroundColor: config.bg }]}>
      <Text style={[styles.pillText, { color: config.text, fontSize: isSmall ? 10 : 11 }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  icon: {
    marginRight: 5,
  },
  text: {
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  pillText: {
    fontWeight: "600",
  },
});
