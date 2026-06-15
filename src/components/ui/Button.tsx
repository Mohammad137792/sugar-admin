import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../context/ThemeContext";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function Button({
  label, onPress, variant = "primary", loading = false, disabled = false, style,
}: Props) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  if (variant === "primary") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[styles.wrap, isDisabled && styles.disabled, style]}
      >
        <LinearGradient
          colors={[colors.violet, colors.pink]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.labelPrimary}>{label}</Text>
          }
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.wrap,
        styles.base,
        variant === "secondary" && {
          backgroundColor: colors.btnSecondaryBg,
          borderWidth: 1,
          borderColor: colors.btnSecondaryBorder,
        },
        variant === "ghost"  && { backgroundColor: "transparent" },
        variant === "danger" && {
          backgroundColor: "rgba(239,68,68,0.12)",
          borderWidth: 1,
          borderColor: colors.error,
        },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={colors.violetLight} size="small" />
        : <Text style={[
            styles.labelBase,
            { color: variant === "danger" ? colors.error : colors.btnSecondaryText },
          ]}>
            {label}
          </Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap:         { borderRadius: 14, overflow: "hidden" },
  gradient:     { paddingVertical: 15, alignItems: "center", borderRadius: 14 },
  base:         { paddingVertical: 15, alignItems: "center" },
  disabled:     { opacity: 0.45 },
  labelPrimary: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
  labelBase:    { fontSize: 15, fontWeight: "600" },
});
