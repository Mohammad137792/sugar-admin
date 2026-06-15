import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  label?: string;
  style?: ViewStyle;
}

export default function Divider({ label, style }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
      {label && <Text style={[styles.text, { color: colors.textMuted }]}>{label}</Text>}
      {label && <View style={[styles.line, { backgroundColor: colors.border }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row:  { flexDirection: "row", alignItems: "center", gap: 12 },
  line: { flex: 1, height: 1 },
  text: { fontSize: 12, fontWeight: "500", letterSpacing: 1 },
});
