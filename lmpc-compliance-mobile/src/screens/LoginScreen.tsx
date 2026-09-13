import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ConfigModal } from "../components/ConfigModal";
import { useAuth } from "../context/AuthContext";

export const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [identifier, setIdentifier] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [configVisible, setConfigVisible] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!identifier.trim() || !password) {
      setErrorMessage("Please enter your username and password.");
      return;
    }

    try {
      await login(identifier.trim(), password);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Invalid username or password. Please try again.";
      setErrorMessage(msg);
    }
  };

  const handleQuickFill = (user: string, pass: string) => {
    setIdentifier(user);
    setPassword(pass);
    setErrorMessage(null);
    login(user, pass).catch((err) => {
      setErrorMessage(err?.message || "Unable to sign in. Please verify your connection.");
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Top Bar with Server Config */}
          <View style={styles.topBar}>
            <View style={styles.govTag}>
              <View style={styles.govDot} />
              <Text style={styles.govTagText}>Legal Metrology</Text>
            </View>
            <TouchableOpacity style={styles.configBtn} onPress={() => setConfigVisible(true)} activeOpacity={0.7}>
              <Ionicons name="settings-outline" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Ionicons name="shield-checkmark" size={32} color="#4F46E5" />
            </View>
            <Text style={styles.title}>LENSPECT</Text>
            <Text style={styles.subtitle}>Package Compliance Scanner</Text>
            <Text style={styles.subtext}>Legal Metrology Inspection App</Text>
          </View>

          {/* Login Card */}
          <View style={styles.formCard}>
            <Text style={styles.cardHeader}>Inspector Sign In</Text>

            {/* Inline Error Message (PhonePe style, zero popups) */}
            {errorMessage && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorBoxText}>{errorMessage}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username or Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={17} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your inspector username"
                  placeholderTextColor="#94A3B8"
                  value={identifier}
                  onChangeText={(val) => {
                    setIdentifier(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={17} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, isLoading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.btnRow}>
                  <Text style={styles.loginBtnText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>

            {/* Quick Demo Access Chips */}
            <View style={styles.quickAccessSection}>
              <Text style={styles.quickAccessLabel}>Quick Sign In for Testing</Text>
              <View style={styles.chipsRow}>
                <TouchableOpacity
                  style={styles.chipBtn}
                  onPress={() => handleQuickFill("inspector", "demo123")}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person" size={13} color="#4F46E5" />
                  <Text style={styles.chipText}>Inspector</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.chipBtn}
                  onPress={() => handleQuickFill("admin@legalmetrology.gov.in", "Admin@123")}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <Ionicons name="shield" size={13} color="#475569" />
                  <Text style={styles.chipText}>Supervisor</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Clean Footer */}
          <View style={styles.footerNote}>
            <Text style={styles.footerText}>
              Legal Metrology (Packaged Commodities) Rules, 2011
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfigModal visible={configVisible} onClose={() => setConfigVisible(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
  },
  govTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  govDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4F46E5",
  },
  govTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4338CA",
  },
  configBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  brandContainer: {
    alignItems: "center",
    marginTop: 18,
    marginBottom: 20,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#4F46E5",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 2,
  },
  subtitle: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  subtext: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 14,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorBoxText: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  eyeBtn: {
    padding: 6,
  },
  loginBtn: {
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  quickAccessSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  quickAccessLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  chipsRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  chipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  footerNote: {
    alignItems: "center",
    marginTop: 18,
  },
  footerText: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
  },
});
