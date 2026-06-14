import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../../constants/colors";
import { useLanguage } from "../../../context/LanguageContext";

export default function AIChatScreen() {
  const { isRTL } = useLanguage();
  return (
    <View style={styles.root}>
      <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>
        {isRTL ? "دستیار هوشمند" : "AI Assistant"}
      </Text>
      <Text style={[styles.sub, { textAlign: isRTL ? "right" : "left" }]}>
        {isRTL ? "به زودی..." : "Coming soon..."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: colors.bg, padding: 24, paddingTop: 32 },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: "700", marginBottom: 8 },
  sub:   { color: colors.textMuted, fontSize: 15 },
});
