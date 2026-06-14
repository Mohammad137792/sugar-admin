import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../constants/colors";

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
          colors={colors.gradientBrand}
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

  const secondary = variant === "secondary";
  const ghost     = variant === "ghost";
  const danger    = variant === "danger";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.wrap,
        styles.base,
        secondary && styles.secondary,
        ghost     && styles.ghost,
        danger    && styles.danger,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={colors.violetLight} size="small" />
        : (
          <Text style={[
            styles.labelBase,
            danger && { color: colors.error },
          ]}>
            {label}
          </Text>
        )
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap:         { borderRadius: 14, overflow: "hidden" },
  gradient:     { paddingVertical: 15, alignItems: "center", borderRadius: 14 },
  base:         { paddingVertical: 15, alignItems: "center" },
  secondary:    { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: colors.border },
  ghost:        { backgroundColor: "transparent" },
  danger:       { backgroundColor: colors.errorDim, borderWidth: 1, borderColor: colors.error },
  disabled:     { opacity: 0.45 },
  labelPrimary: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
  labelBase:    { color: colors.textSecondary, fontSize: 15, fontWeight: "600" },
});
