import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../../context/ThemeContext";

type BadgeVariant = "success" | "warning" | "error" | "info" | "brand";

interface Props {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export default function Badge({ label, variant = "brand", style }: Props) {
  const { colors } = useTheme();

  const colorMap: Record<BadgeVariant, { bg: string; text: string }> = {
    success: { bg: "rgba(16,185,129,0.12)",  text: colors.success },
    warning: { bg: "rgba(245,158,11,0.12)",  text: colors.warning },
    error:   { bg: "rgba(239,68,68,0.12)",   text: colors.error },
    info:    { bg: "rgba(59,130,246,0.12)",  text: colors.info },
    brand:   { bg: colors.iconBadgeBg,       text: colors.violetLight },
  };

  const c = colorMap[variant];

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
});
