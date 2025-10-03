import React, { memo } from "react";
import { View, Text, useColorScheme, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

type Props = {
  label?: string;
  opacity?: number; // 0.03–0.08 feels subtle
  size?: number;
  gap?: number;
};

function WatermarkOverlay({ label = "Questly", opacity = 0.06, size = 22, gap = 120 }: Props) {
  const isDark = useColorScheme() === "dark";
  const color = isDark ? "#FFFFFF" : "#111827";

  const cols = Math.ceil(width / gap) + 1;
  const rows = Math.ceil(height / gap) + 1;

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}
    >
      <View
        style={{
          position: "absolute",
          top: -height * 0.2,
          left: -width * 0.2,
          right: -width * 0.2,
          bottom: -height * 0.2,
          transform: [{ rotate: "-30deg" }],
          opacity,
        }}
      >
        {Array.from({ length: rows }).map((_, r) => (
          <View key={r} style={{ flexDirection: "row", marginTop: r === 0 ? 0 : gap }}>
            {Array.from({ length: cols }).map((__, c) => (
              <Text key={c} style={{ marginLeft: c === 0 ? 0 : gap, fontSize: size, fontWeight: "700", color }}>
                {label}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

export default memo(WatermarkOverlay);
