import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useIsFocused, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraOverlay } from "../components/CameraOverlay";
import { RootStackParamList } from "../navigation/types";
import { compressImage } from "../services/imageProcessor";
import { GeoLocationResult, LocationService } from "../services/locationService";
import { getNetworkTimestamp } from "../services/networkTime";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ScanCaptureScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<any>(null);

  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0,
    48
  );
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 28 : 20);

  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState<boolean>(false);
  const [capturing, setCapturing] = useState<boolean>(false);
  const [location, setLocation] = useState<GeoLocationResult | null>(null);
  const [locating, setLocating] = useState<boolean>(true);

  // Multi-image state: holds array of captured photo URIs (up to 4 sides)
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>(
    route.params?.existingPhotos || []
  );

  // If returning with existing photos, synchronize state
  useEffect(() => {
    if (route.params?.existingPhotos) {
      setCapturedPhotos(route.params.existingPhotos);
    }
  }, [route.params?.existingPhotos]);

  // Acquire GPS position eagerly
  useEffect(() => {
    let isMounted = true;
    const fetchGps = async () => {
      try {
        setLocating(true);
        const loc = await LocationService.getCurrentLocation();
        if (isMounted) setLocation(loc);
      } catch (err: any) {
        console.warn("GPS Warning:", err.message);
      } finally {
        if (isMounted) setLocating(false);
      }
    };

    if (isFocused) {
      fetchGps();
    }

    return () => {
      isMounted = false;
    };
  }, [isFocused]);

  // ─── Shutter Handler ────────────────────────────────────────────────────────
  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;
    if (capturedPhotos.length >= 4) return;

    try {
      setCapturing(true);

      const rawPhotoPromise = cameraRef.current.takePictureAsync({
        quality: 1.0,
        skipProcessing: false,
        exif: false,
      });

      const [photo, gpsSnapshot] = await Promise.all([
        rawPhotoPromise,
        LocationService.getCurrentLocation().catch(() => location),
      ]);

      if (!photo?.uri) {
        throw new Error("Camera did not return a photo URI.");
      }

      if (gpsSnapshot && !location) {
        setLocation(gpsSnapshot);
      }

      // Client-side compression
      const compressed = await compressImage(photo.uri);
      const updatedPhotos = [...capturedPhotos, compressed.uri];
      setCapturedPhotos(updatedPhotos);
    } catch (err: any) {
      console.warn("Capture error:", err.message);
    } finally {
      setCapturing(false);
    }
  };

  // ─── Finish and Navigate to Review ──────────────────────────────────────────
  const handleProceed = async () => {
    if (capturedPhotos.length === 0) return;

    try {
      const networkTs = await getNetworkTimestamp();
      const latitude = location?.latitude ?? 28.6139;
      const longitude = location?.longitude ?? 77.209;
      const address = location?.address || "New Delhi, Central District";

      navigation.navigate("InspectionPreview", {
        photoUri: capturedPhotos[0],
        photoUris: capturedPhotos,
        latitude,
        longitude,
        address,
        networkTimestamp: networkTs.iso,
        timestampSource: networkTs.source,
      });
    } catch {
      // Fallback
      navigation.navigate("InspectionPreview", {
        photoUri: capturedPhotos[0],
        photoUris: capturedPhotos,
        latitude: location?.latitude ?? 28.6139,
        longitude: location?.longitude ?? 77.209,
        address: location?.address,
      });
    }
  };

  const removePhoto = (index: number) => {
    const next = capturedPhotos.filter((_, idx) => idx !== index);
    setCapturedPhotos(next);
  };

  // ─── Permission States ───────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={54} color="#94A3B8" />
        <Text style={styles.permTitle}>Camera Permission Required</Text>
        <Text style={styles.permDesc}>
          LMPC Field Scanner needs camera access to inspect package labels and verify declarations.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.8}>
          <Text style={styles.permBtnText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const hasPhotos = capturedPhotos.length > 0;
  const isMaxReached = capturedPhotos.length >= 4;

  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torch}
        />
      )}

      {/* Viewfinder Overlay */}
      <CameraOverlay />

      {/* Top Controls Bar */}
      <View style={[styles.topControlContainer, { paddingTop: topInset }]}>
        <View style={styles.topControls}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.gpsIndicator}>
            <Ionicons
              name={location ? "location" : "location-outline"}
              size={14}
              color={location ? "#10B981" : "#F59E0B"}
            />
            <Text style={styles.gpsText}>
              {locating ? "Finding GPS..." : location ? "GPS Ready" : "Location Active"}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.iconButton, torch && styles.iconButtonActive]}
            onPress={() => setTorch(!torch)}
            activeOpacity={0.7}
          >
            <Ionicons name={torch ? "flash" : "flash-off"} size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Multi-side Hint Pill */}
        {hasPhotos && (
          <View style={styles.sideHintPill}>
            <Ionicons name="information-circle-outline" size={14} color="#FFFFFF" />
            <Text style={styles.sideHintText}>
              {capturedPhotos.length === 1
                ? "Side 1 captured! Flip package to snap opposite side, or tap Done"
                : `${capturedPhotos.length} sides captured. Snap another side or tap Done`}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Controls Bar */}
      <View style={[styles.bottomControlContainer, { bottom: bottomInset }]}>
        {/* Thumbnails Row if photos captured */}
        {hasPhotos && (
          <View style={styles.thumbStrip}>
            {capturedPhotos.map((uri, idx) => (
              <View key={idx} style={styles.thumbWrap}>
                <Image source={{ uri }} style={styles.thumbImage} />
                <View style={styles.thumbBadge}>
                  <Text style={styles.thumbBadgeText}>{idx === 0 ? "Front" : idx === 1 ? "Back" : `Side ${idx + 1}`}</Text>
                </View>
                <TouchableOpacity
                  style={styles.thumbDeleteBtn}
                  onPress={() => removePhoto(idx)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={12} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.shutterRow}>
          {/* Left spacer or placeholder */}
          <View style={styles.sideSlot}>
            {hasPhotos && (
              <Text style={styles.sideCountText}>
                {capturedPhotos.length}/4 Sides
              </Text>
            )}
          </View>

          {/* Center Shutter Button */}
          <TouchableOpacity
            style={[styles.shutterBtn, isMaxReached && styles.shutterDisabled]}
            onPress={handleCapture}
            disabled={capturing || isMaxReached}
            activeOpacity={0.7}
          >
            <View style={styles.shutterInner}>
              {capturing && <ActivityIndicator color="#4F46E5" size="small" />}
            </View>
          </TouchableOpacity>

          {/* Right Action: Done Button */}
          <View style={styles.sideSlot}>
            {hasPhotos ? (
              <TouchableOpacity style={styles.doneBtn} onPress={handleProceed} activeOpacity={0.8}>
                <Text style={styles.doneBtnText}>Done ({capturedPhotos.length})</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 60 }} />
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  permTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  permDesc: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  permBtn: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  topControlContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 20,
  },
  topControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  iconButtonActive: {
    backgroundColor: "rgba(234, 179, 8, 0.4)",
    borderColor: "#EAB308",
  },
  gpsIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  gpsText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "600",
  },
  sideHintPill: {
    marginTop: 10,
    alignSelf: "center",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  sideHintText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  bottomControlContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: "center",
  },
  thumbStrip: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  thumbWrap: {
    position: "relative",
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: "visible",
  },
  thumbImage: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#4F46E5",
  },
  thumbBadge: {
    position: "absolute",
    bottom: -6,
    alignSelf: "center",
    backgroundColor: "#1E1B4B",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  thumbBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  thumbDeleteBtn: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#DC2626",
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  shutterRow: {
    width: "100%",
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sideSlot: {
    width: 90,
    justifyContent: "center",
    alignItems: "center",
  },
  sideCountText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
  },
  shutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  shutterDisabled: {
    opacity: 0.4,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#16A34A",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
