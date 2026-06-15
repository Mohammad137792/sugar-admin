import { View, Text, TouchableOpacity, ScrollView, StatusBar, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../navigation/types";
import Logo from "../components/Logo";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import type { ThemeColors } from "../constants/theme";

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, "Home">;
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 48 },

    glowTopRight: {
      position: "absolute",
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: c.violet,
      opacity: c.glowVioletOpacity,
      top: -80,
      right: -80,
    },
    glowBottomLeft: {
      position: "absolute",
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: c.pink,
      opacity: c.glowPinkOpacity,
      bottom: 200,
      left: -80,
    },

    topBar: { paddingTop: 56, paddingHorizontal: 24, flexDirection: "row", justifyContent: "flex-end", gap: 10 },
    pill: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
      backgroundColor: c.btnSecondaryBg,
    },
    pillText: { color: c.violetLight, fontSize: 13, fontWeight: "600", letterSpacing: 0.8 },

    hero: { alignItems: "center", paddingHorizontal: 28, paddingTop: 40, paddingBottom: 32 },
    appName: { color: c.textPrimary, fontSize: 30, fontWeight: "800", marginTop: 20, letterSpacing: 0.5 },
    subtitleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8, marginBottom: 28 },
    subtitleLine: { height: 1, width: 28, backgroundColor: c.violet, opacity: 0.5 },
    appSubtitle: {
      color: c.violetLight,
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 3,
      textTransform: "uppercase",
    },
    heroTitle: { color: c.textPrimary, fontSize: 22, fontWeight: "700", lineHeight: 34, marginBottom: 12 },
    heroSub: { color: c.textMuted, fontSize: 14, lineHeight: 24, paddingHorizontal: 8 },

    btnGroup: { paddingHorizontal: 24, gap: 12, marginBottom: 36 },
    btnPrimaryWrap: { borderRadius: 16, overflow: "hidden" },
    btnPrimary: { paddingVertical: 16, alignItems: "center", borderRadius: 16 },
    btnPrimaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
    btnSecondary: {
      paddingVertical: 15,
      alignItems: "center",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.btnSecondaryBorder,
      backgroundColor: c.btnSecondaryBg,
    },
    btnSecondaryText: { color: c.btnSecondaryText, fontSize: 15, fontWeight: "600" },

    divider: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, gap: 12, marginBottom: 24 },
    dividerLine: { flex: 1, height: 1, backgroundColor: c.border },
    dividerLabel: { color: c.textMuted, fontSize: 12, fontWeight: "500", letterSpacing: 1 },

    features: { paddingHorizontal: 24, gap: 4, marginBottom: 32 },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    featureIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.iconBadgeBg,
      borderWidth: 1,
      borderColor: c.iconBadgeBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    featureIcon: { color: c.violetLight, fontSize: 16 },
    featureText: { flex: 1 },
    featureTitle: { color: c.textSecondary, fontSize: 15, fontWeight: "600", marginBottom: 2 },
    featureDesc: { color: c.textMuted, fontSize: 13, lineHeight: 20 },

    aboutCard: {
      marginHorizontal: 24,
      backgroundColor: c.card,
      borderRadius: 20,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 32,
    },
    aboutAccent: { height: 3 },
    aboutTitle: {
      color: c.textPrimary,
      fontSize: 17,
      fontWeight: "700",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 10,
    },
    aboutText: { color: c.textMuted, fontSize: 14, lineHeight: 26, paddingHorizontal: 20, paddingBottom: 16 },
    missionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: c.missionBg,
    },
    missionDot: { color: c.violetLight, fontSize: 10 },
    missionText: { color: c.missionText, fontSize: 13, fontWeight: "500", flex: 1 },

    footer: { color: c.textFaint, fontSize: 12, textAlign: "center" },
  });

export default function HomeScreen({ navigation }: Props) {
  const { t, isRTL, toggleLanguage } = useLanguage();
  const { colors: c, isDark, toggleTheme } = useTheme();
  const s = makeStyles(c);

  const features = [
    { icon: "◆", title: t("feat1Title"), desc: t("feat1Desc") },
    { icon: "◈", title: t("feat2Title"), desc: t("feat2Desc") },
    { icon: "⬡", title: t("feat3Title"), desc: t("feat3Desc") },
  ];

  return (
    <View style={s.root}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={c.bg}
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={s.glowTopRight} />
        <View style={s.glowBottomLeft} />

        {/* ── Controls ── */}
        <View style={s.topBar}>
          {/* Theme toggle */}
          <TouchableOpacity
            onPress={toggleTheme}
            style={s.pill}>
            <Text style={s.pillText}>{isDark ? "☀" : "☾"}</Text>
          </TouchableOpacity>

          {/* Language toggle */}
          <TouchableOpacity
            onPress={toggleLanguage}
            style={s.pill}>
            <Text style={s.pillText}>{t("langToggle")}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Hero ── */}
        <View style={s.hero}>
          <Logo size={84} />
          <Text style={s.appName}>{t("appName")}</Text>
          <View style={s.subtitleRow}>
            <View style={s.subtitleLine} />
            <Text style={s.appSubtitle}>{t("appSubtitle")}</Text>
            <View style={s.subtitleLine} />
          </View>
          <Text style={[s.heroTitle, { textAlign: "center" }]}>{t("hero")}</Text>
          <Text style={[s.heroSub, { textAlign: "center" }]}>{t("heroSub")}</Text>
        </View>

        {/* ── Buttons ── */}
        <View style={s.btnGroup}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate("Dashboard")}
            style={s.btnPrimaryWrap}>
            <LinearGradient
              colors={[c.violet, c.pink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.btnPrimary}>
              <Text style={s.btnPrimaryText}>{t("navBtn1")}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Reports")}
            style={s.btnSecondary}>
            <Text style={s.btnSecondaryText} numberOfLines={1}>{t("navBtn2")}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Features ── */}
        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerLabel}>{isRTL ? "ویژگی‌ها" : "Features"}</Text>
          <View style={s.dividerLine} />
        </View>

        <View style={s.features}>
          {features.map((f, i) => (
            <View
              key={i}
              style={s.featureRow}>
              <View style={s.featureIconWrap}>
                <Text style={s.featureIcon}>{f.icon}</Text>
              </View>
              <View style={s.featureText}>
                <Text style={[s.featureTitle, { textAlign: isRTL ? "right" : "left" }]}>{f.title}</Text>
                <Text style={[s.featureDesc, { textAlign: isRTL ? "right" : "left" }]}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── About ── */}
        <View style={s.aboutCard}>
          <LinearGradient
            colors={[c.violet, c.pink]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.aboutAccent}
          />
          <Text style={[s.aboutTitle, { textAlign: isRTL ? "right" : "left" }]}>{t("aboutTitle")}</Text>
          <Text style={[s.aboutText, { textAlign: isRTL ? "right" : "left" }]}>{t("aboutText")}</Text>
          <View style={s.missionRow}>
            <Text style={s.missionDot}>✦</Text>
            <Text style={[s.missionText, { textAlign: isRTL ? "right" : "left" }]}>{t("aboutMission")}</Text>
          </View>
        </View>

        <Text style={s.footer}>© 2025 Sugar Admin</Text>
      </ScrollView>
    </View>
  );
}
