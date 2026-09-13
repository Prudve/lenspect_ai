import React, { useState } from "react";
import { Dimensions, Image, LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { BoundingBox } from "../types/inspection";

interface Props {
  imageUrl: string;
  boundingBoxes: BoundingBox[];
}

export const BoundingBoxViewer: React.FC<Props> = ({ imageUrl, boundingBoxes }) => {
  const [containerLayout, setContainerLayout] = useState<{ width: number; height: number } | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerLayout({ width, height });
  };

  React.useEffect(() => {
    if (imageUrl) {
      Image.getSize(
        imageUrl,
        (width, height) => setImageDimensions({ width, height }),
        () => setImageDimensions({ width: 800, height: 600 }) // fallback aspect
      );
    }
  }, [imageUrl]);

  const scaleFactorX = containerLayout && imageDimensions ? containerLayout.width / imageDimensions.width : 1;
  const scaleFactorY = containerLayout && imageDimensions ? containerLayout.height / imageDimensions.height : 1;

  const getBadgeColor = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes("mrp") || lower.includes("price")) return "#10B981"; // Green
    if (lower.includes("mfg") || lower.includes("date")) return "#3B82F6";  // Blue
    if (lower.includes("unit") || lower.includes("net")) return "#F59E0B";  // Amber
    if (lower.includes("origin") || lower.includes("country")) return "#8B5CF6"; // Purple
    return "#EF4444"; // Red / other
  };

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />

      {/* Render bounding boxes if coordinates are available */}
      {containerLayout &&
        boundingBoxes?.map((box, index) => {
          // Normalize coordinates if normalized (0-1) or absolute pixels
          const isNormalized = box.w <= 1 && box.h <= 1;
          const left = isNormalized ? box.x * containerLayout.width : box.x * scaleFactorX;
          const top = isNormalized ? box.y * containerLayout.height : box.y * scaleFactorY;
          const width = isNormalized ? box.w * containerLayout.width : box.w * scaleFactorX;
          const height = isNormalized ? box.h * containerLayout.height : box.h * scaleFactorY;
          const color = getBadgeColor(box.label);

          return (
            <View
              key={`box-${index}`}
              style={[
                styles.box,
                {
                  left,
                  top,
                  width,
                  height,
                  borderColor: color,
                },
              ]}
            >
              <View style={[styles.labelTag, { backgroundColor: color }]}>
                <Text style={styles.labelText}>{box.label}</Text>
              </View>
            </View>
          );
        })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 280,
    backgroundColor: "#020617",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  box: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  labelTag: {
    position: "absolute",
    top: -18,
    left: 0,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  labelText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
});
