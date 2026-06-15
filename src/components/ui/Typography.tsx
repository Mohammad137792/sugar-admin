import { Text, StyleSheet, TextStyle } from "react-native";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  children: React.ReactNode;
  style?: TextStyle;
  align?: "left" | "center" | "right";
  numberOfLines?: number;
}

export function Heading({ children, style, align, numberOfLines }: Props) {
  const { colors } = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[s.heading, { color: colors.textPrimary, textAlign: align }, style]}>
      {children}
    </Text>
  );
}

export function SubHeading({ children, style, align, numberOfLines }: Props) {
  const { colors } = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[s.subheading, { color: colors.textPrimary, textAlign: align }, style]}>
      {children}
    </Text>
  );
}

export function Body({ children, style, align, numberOfLines }: Props) {
  const { colors } = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[s.body, { color: colors.textSecondary, textAlign: align }, style]}>
      {children}
    </Text>
  );
}

export function Caption({ children, style, align, numberOfLines }: Props) {
  const { colors } = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[s.caption, { color: colors.textMuted, textAlign: align }, style]}>
      {children}
    </Text>
  );
}

export function Label({ children, style, align, numberOfLines }: Props) {
  const { colors } = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[s.label, { color: colors.violetLight, textAlign: align }, style]}>
      {children}
    </Text>
  );
}

export function Muted({ children, style, align, numberOfLines }: Props) {
  const { colors } = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[s.body, { color: colors.textFaint, textAlign: align }, style]}>
      {children}
    </Text>
  );
}

const s = StyleSheet.create({
  heading:    { fontSize: 28, fontWeight: "800", lineHeight: 36 },
  subheading: { fontSize: 20, fontWeight: "700", lineHeight: 28 },
  body:       { fontSize: 15, lineHeight: 24 },
  caption:    { fontSize: 13, lineHeight: 20 },
  label:      { fontSize: 12, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase" },
});
