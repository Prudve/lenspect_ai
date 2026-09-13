import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const CameraOverlay: React.FC = () => {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <View style={styles.container}>
        {/* Clean, unobtrusive framing guide */}
        <View style={styles.viewfinder}>
          {/* Subtle corner reticles */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />

          {/* Minimal guidance pill at bottom of viewfinder */}
          <View style={styles.guidancePill}>
            <Text style={styles.guidanceText}>Position package label inside frame</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  viewfinder: {
    width: SCREEN_WIDTH * 0.88,
    height: SCREEN_HEIGHT * 0.48,
    position: "relative",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 16,
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomRightRadius: 10,
  },
  guidancePill: {
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  guidanceText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
});
