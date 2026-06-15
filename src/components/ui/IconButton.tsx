import { TouchableOpacity, Text, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../../context/ThemeContext";

type IconButtonVariant = "ghost" | "surface" | "brand";

interface Props {
  icon: string;
  onPress: () => void;
  size?: number;
  variant?: IconButtonVariant;
  style?: ViewStyle;
}

export default function IconButton({ icon, onPress, size = 40, variant = "surface", style }: Props) {
  const { colors } = useTheme();

  const bgMap: Record<IconButtonVariant, string> = {
    ghost:   "transparent",
    surface: colors.surface,
    brand:   colors.iconBadgeBg,
  };

  const borderMap: Record<IconButtonVariant, string> = {
    ghost:   "transparent",
    surface: colors.border,
    brand:   colors.iconBadgeBorder,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.btn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgMap[variant],
          borderColor: borderMap[variant],
        },
        style,
      ]}
    >
      <Text style={[styles.icon, { color: colors.violetLight, fontSize: size * 0.4 }]}>{icon}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn:  { alignItems: "center", justifyContent: "center", borderWidth: 1 },
  icon: { textAlign: "center" },
});
