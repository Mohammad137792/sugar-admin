import { View, StyleSheet, ViewStyle } from "react-native";

interface Props {
  children: React.ReactNode;
  align?: "flex-start" | "center" | "flex-end" | "stretch";
  justify?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around";
  gap?: number;
  style?: ViewStyle;
}

export default function Row({
  children,
  align = "center",
  justify = "flex-start",
  gap = 0,
  style,
}: Props) {
  return (
    <View style={[styles.row, { alignItems: align, justifyContent: justify, gap }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
});
