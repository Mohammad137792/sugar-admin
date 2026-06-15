import { View, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export default function Card({ children, style, padded = true }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[
      styles.card,
      { backgroundColor: colors.card, borderColor: colors.border },
      padded && styles.padded,
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card:   { borderRadius: 18, borderWidth: 1 },
  padded: { padding: 18 },
});
