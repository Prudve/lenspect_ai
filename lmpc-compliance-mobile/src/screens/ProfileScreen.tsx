import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ConfigModal } from "../components/ConfigModal";
import { useAuth } from "../context/AuthContext";
import { getApiBaseUrl } from "../services/api";

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [configVisible, setConfigVisible] = useState<boolean>(false);
  const [currentUrl, setCurrentUrl] = useState<string>("");

  useEffect(() => {
    getApiBaseUrl().then((u) => setCurrentUrl(u));
  }, [configVisible]);

  const handleLogout = () => {
    Alert.alert("Confirm Sign Out", "Are you sure you want to end your field inspection session?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Officer Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{user?.fullName?.charAt(0) || "I"}</Text>
          </View>
          <Text style={styles.officerName}>{user?.fullName || "Field Officer"}</Text>
          <Text style={styles.officerEmail}>{user?.email || "officer@lmpc.gov"}</Text>

          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#2563EB" style={{ marginRight: 4 }} />
            <Text style={styles.roleText}>{user?.role || "INSPECTOR"}</Text>
          </View>
        </View>

        {/* Section: Server & Connectivity */}
        <Text style={styles.sectionHeader}>Connectivity & Integration</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuRow} onPress={() => setConfigVisible(true)}>
            <View style={styles.rowLeft}>
              <Ionicons name="server-outline" size={20} color="#2563EB" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.rowTitle}>Backend Server Endpoint</Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {currentUrl || "Not configured"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Section: Legal Metrology Info */}
        <Text style={styles.sectionHeader}>Department Information</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Department</Text>
            <Text style={styles.infoValue}>Legal Metrology</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Statutory Act</Text>
            <Text style={styles.infoValue}>Legal Metrology Act, 2009</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rules Enforced</Text>
            <Text style={styles.infoValue}>LMPC Rules, 2011</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0 (Production)</Text>
          </View>
        </View>

        {/* Logout CTA */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <ConfigModal visible={configVisible} onClose={() => setConfigVisible(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#BFDBFE",
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E40AF",
  },
  officerName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  officerEmail: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 10,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E40AF",
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  rowSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    maxWidth: 220,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  logoutBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 10,
  },
  logoutText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "700",
  },
});
