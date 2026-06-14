import { View, Text, ScrollView, StyleSheet } from "react-native";
import { colors } from "../../../constants/colors";
import { Card } from "../../../components/ui";
import { useLanguage } from "../../../context/LanguageContext";
import type { Stat } from "../../../types";

const MOCK_STATS: Stat[] = [
  { label: "Users",   labelFa: "کاربران",   value: "1,284", change: 12,  trend: "up" },
  { label: "Content", labelFa: "محتوا",     value: "348",   change: -3,  trend: "down" },
  { label: "Revenue", labelFa: "درآمد",     value: "$9.2K", change: 24,  trend: "up" },
  { label: "AI Calls",labelFa: "تماس هوش", value: "5,610", change: 8,   trend: "up" },
];

export default function DashboardScreen() {
  const { isRTL } = useLanguage();
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>
        {isRTL ? "خلاصه وضعیت" : "Overview"}
      </Text>
      <View style={styles.grid}>
        {MOCK_STATS.map((s, i) => (
          <Card key={i} style={styles.statCard}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{isRTL ? s.labelFa : s.label}</Text>
            <Text style={[styles.statChange, { color: s.trend === "up" ? colors.success : colors.error }]}>
              {s.trend === "up" ? "▲" : "▼"} {Math.abs(s.change ?? 0)}%
            </Text>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: colors.bg },
  content:   { padding: 20, paddingTop: 24 },
  title:     { color: colors.textPrimary, fontSize: 22, fontWeight: "700", marginBottom: 20 },
  grid:      { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard:  { width: "47%", alignItems: "center", gap: 4 },
  statValue: { color: colors.textPrimary, fontSize: 24, fontWeight: "800" },
  statLabel: { color: colors.textMuted, fontSize: 13 },
  statChange:{ fontSize: 12, fontWeight: "600" },
});
