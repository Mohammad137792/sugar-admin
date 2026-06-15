import { TouchableOpacity, Text, ViewStyle, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";

interface Props {
  label: string;
  onPress?: () => void;
  style?: ViewStyle;
  textColor?: string;
  intensity?: number;
  fontSize?: number;
}

export default function GlassPill({
  label,
  onPress,
  style,
  textColor = "rgba(255,255,255,0.85)",
  intensity = 50,
  fontSize = 13,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.pill, style]}
    >
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <Text style={[styles.label, { color: textColor, fontSize }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  label: {
    fontWeight: "600",
    letterSpacing: 0.8,
  },
});
