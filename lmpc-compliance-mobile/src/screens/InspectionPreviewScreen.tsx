import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
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
import { useOffline } from "../context/OfflineContext";
import { RootStackParamList } from "../navigation/types";
import { InspectionApi } from "../services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type ScreenRouteProp = RouteProp<RootStackParamList, "InspectionPreview">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const InspectionPreviewScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { photoUri, photoUris, latitude, longitude, address, networkTimestamp, timestampSource } = route.params;

  const { isOnline, enqueueInspection } = useOffline();

  // Multi-image list
  const [photos, setPhotos] = useState<string[]>(
    photoUris && photoUris.length > 0 ? photoUris : photoUri ? [photoUri] : []
  );

  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [merchantName, setMerchantName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddMorePhotos = () => {
    // Navigate back to camera passing existing photos
    navigation.navigate("MainTabs", {
      screen: "Scan",
      params: { existingPhotos: photos },
    } as any);
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    if (photos.length <= 1) {
      // If removing the only photo, return to camera
      navigation.navigate("MainTabs", { screen: "Scan" } as any);
      return;
    }
    const updated = photos.filter((_, idx) => idx !== indexToRemove);
    setPhotos(updated);
    if (activePhotoIndex >= updated.length) {
      setActivePhotoIndex(updated.length - 1);
    }
  };

  const handleSubmit = async () => {
    if (photos.length === 0) return;
    setErrorMessage(null);

    // If offline, save to device and navigate to Dashboard smoothly
    if (!isOnline) {
      await handleQueueOffline();
      return;
    }

    setSubmitting(true);
    try {
      let inspection;
      if (photos.length > 1) {
        // Multi-side inspection upload
        const panelLabels = photos.map((_, idx) =>
          idx === 0 ? "front" : idx === 1 ? "back" : idx === 2 ? "flap" : "side"
        );
        inspection = await InspectionApi.uploadMultiScan({
          imageUris: photos,
          latitude,
          longitude,
          panelLabels,
        });
      } else {
        // Single image upload
        inspection = await InspectionApi.uploadScan({
          imageUri: photos[0],
          latitude,
          longitude,
        });
      }

      // PhonePe frictionless flow: navigate immediately without blocking popups!
      navigation.replace("InspectionDetail", { inspectionId: inspection._id });
    } catch (err: any) {
      console.warn("Direct upload failed, saving offline fallback:", err);
      // If server unreachable, automatically save offline without blocking alert popups
      await handleQueueOffline();
    } finally {
      setSubmitting(false);
    }
  };

  const handleQueueOffline = async () => {
    try {
      await enqueueInspection({
        imageUri: photos[0],
        imageUris: photos,
        latitude,
        longitude,
        networkTimestamp: networkTimestamp || new Date().toISOString(),
        timestampSource: timestampSource || "device",
        merchantName: merchantName.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // Frictionless navigate to Dashboard tab
      navigation.navigate("MainTabs", { screen: "Dashboard" } as any);
    } catch (err: any) {
      setErrorMessage(err.message || "Could not save scan offline. Please try again.");
    }
  };

  const getSideName = (idx: number) => {
    if (idx === 0) return "Side 1 (Front)";
    if (idx === 1) return "Side 2 (Back / Opposite)";
    if (idx === 2) return "Side 3 (Top / Flap)";
    return `Side ${idx + 1}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.navigate("MainTabs", { screen: "Scan" } as any)}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
            <Text style={styles.backText}>Camera</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>
            Review Photos ({photos.length})
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Main Selected Photo Preview */}
          <View style={styles.imageContainer}>
            {photos[activePhotoIndex] ? (
              <Image
                source={{ uri: photos[activePhotoIndex] }}
                style={styles.image}
                resizeMode="contain"
              />
            ) : null}

            {/* Current Side Badge */}
            <View style={styles.panelBadge}>
              <Text style={styles.panelBadgeText}>
                {getSideName(activePhotoIndex)}
              </Text>
            </View>

            {/* Delete current photo button */}
            <TouchableOpacity
              style={styles.deletePhotoBtn}
              onPress={() => handleRemovePhoto(activePhotoIndex)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Multiple Photos Thumbnails Tray + Add Button */}
          <View style={styles.photoTrayCard}>
            <View style={styles.photoTrayHeader}>
              <Text style={styles.photoTrayTitle}>Package Sides</Text>
              <Text style={styles.photoTraySub}>
                {photos.length === 1 ? "1 side captured" : `${photos.length} sides captured`}
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbsScroll}>
              {photos.map((uri, idx) => {
                const isActive = idx === activePhotoIndex;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.thumbBox, isActive && styles.thumbBoxActive]}
                    onPress={() => setActivePhotoIndex(idx)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri }} style={styles.thumbImg} />
                    <Text style={[styles.thumbLabel, isActive && styles.thumbLabelActive]}>
                      {idx === 0 ? "Front" : idx === 1 ? "Back" : `Side ${idx + 1}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Add Opposite Side Button */}
              {photos.length < 4 && (
                <TouchableOpacity
                  style={styles.addSideBtn}
                  onPress={handleAddMorePhotos}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#4F46E5" />
                  <Text style={styles.addSideBtnText}>
                    {photos.length === 1 ? "+ Add Opposite Side" : "+ Add Side"}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* Location Info */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="location" size={18} color="#4F46E5" />
              <Text style={styles.cardHeading}>Location</Text>
            </View>
            <Text style={styles.locationText}>
              {address || `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`}
            </Text>
          </View>

          {/* Optional Details */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Store Details (Optional)</Text>

            <Text style={styles.inputLabel}>Shop or Merchant Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Metro Supermarket, Store #12"
              placeholderTextColor="#94A3B8"
              value={merchantName}
              onChangeText={setMerchantName}
            />

            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Any comments on package condition..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={2}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons
                  name={isOnline ? "shield-checkmark" : "save-outline"}
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.primaryBtnText}>
                  {isOnline
                    ? photos.length > 1
                      ? `Check Compliance (${photos.length} Sides)`
                      : "Check Compliance"
                    : `Save ${photos.length} Scan(s) Offline`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
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
    gap: 4,
  },
  backText: {
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "600",
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  imageContainer: {
    width: "100%",
    height: 250,
    backgroundColor: "#0F172A",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  panelBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  panelBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  deletePhotoBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(220, 38, 38, 0.85)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  photoTrayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  photoTrayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  photoTrayTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  photoTraySub: {
    fontSize: 12,
    color: "#64748B",
  },
  thumbsScroll: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  thumbBox: {
    alignItems: "center",
    padding: 3,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbBoxActive: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  thumbImg: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  thumbLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 4,
  },
  thumbLabelActive: {
    color: "#4F46E5",
    fontWeight: "700",
  },
  addSideBtn: {
    width: 105,
    height: 64,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#A5B4FC",
    backgroundColor: "#F5F3FF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  addSideBtnText: {
    color: "#4F46E5",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  locationText: {
    fontSize: 13,
    color: "#475569",
    marginTop: 2,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginTop: 12,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  textArea: {
    minHeight: 54,
    textAlignVertical: "top",
  },
  primaryBtn: {
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
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
