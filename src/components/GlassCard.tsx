import { View, ViewStyle, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  /** Top sheen opacity — the subtle white highlight Apple puts on glass */
  sheenOpacity?: number;
  borderRadius?: number;
  borderColor?: string;
  padded?: boolean;
}

export default function GlassCard({
  children,
  style,
  intensity = 55,
  sheenOpacity = 0.1,
  borderRadius = 22,
  borderColor = "rgba(255,255,255,0.16)",
  padded = true,
}: Props) {
  return (
    <View
      style={[
        {
          borderRadius,
          borderWidth: 1,
          borderColor,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {/* ① Blur layer — blurs the colorful background behind the card */}
      <BlurView
        intensity={intensity}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />

      {/* ② Dark overlay — adds depth, prevents card from being too transparent */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(8,8,18,0.45)" },
        ]}
      />

      {/* ③ Top sheen — the subtle white highlight Apple puts at the top of glass */}
      <LinearGradient
        colors={[
          `rgba(255,255,255,${sheenOpacity})`,
          "rgba(255,255,255,0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { height: "45%" }]}
      />

      {/* ④ Content — renders crisp on top */}
      <View style={padded ? styles.padded : undefined}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  padded: { padding: 18 },
});
