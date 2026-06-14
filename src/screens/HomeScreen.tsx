import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../navigation/types";
import Logo from "../components/Logo";
import { useLanguage } from "../context/LanguageContext";

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, "Home">;
};


const BG = "#07080F";
const CARD = "#0E1018";
const BORDER = "rgba(255,255,255,0.08)";
const VIOLET = "#7C3AED";
const PINK = "#DB2777";
const MUTED = "#6B7280";
const WHITE = "#FFFFFF";
const LIGHT = "#E5E7EB";

export default function HomeScreen({ navigation }: Props) {
  const { t, isRTL, toggleLanguage } = useLanguage();

  const features: { icon: string; title: string; desc: string }[] = [
    { icon: "◆", title: t("feat1Title"), desc: t("feat1Desc") },
    { icon: "◈", title: t("feat2Title"), desc: t("feat2Desc") },
    { icon: "⬡", title: t("feat3Title"), desc: t("feat3Desc") },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Ambient glows ─── */}
        <View style={styles.glowTopRight} />
        <View style={styles.glowBottomLeft} />

        {/* ─── Language toggle ─── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={toggleLanguage} style={styles.langBtn}>
            <Text style={styles.langBtnText}>{t("langToggle")}</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Hero ─── */}
        <View style={styles.hero}>
          <Logo size={84} />

          <Text style={styles.appName}>{t("appName")}</Text>

          <View style={styles.subtitleRow}>
            <View style={styles.subtitleLine} />
            <Text style={styles.appSubtitle}>{t("appSubtitle")}</Text>
            <View style={styles.subtitleLine} />
          </View>

          <Text style={[styles.heroTitle, { textAlign: isRTL ? "center" : "center" }]}>
            {t("hero")}
          </Text>
          <Text style={[styles.heroSub, { textAlign: "center" }]}>
            {t("heroSub")}
          </Text>
        </View>

        {/* ─── CTA Buttons ─── */}
        <View style={styles.btnGroup}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate("Dashboard")}
            style={styles.btnPrimaryWrap}
          >
            <LinearGradient
              colors={[VIOLET, PINK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnPrimary}
            >
              <Text style={styles.btnPrimaryText}>{t("navBtn1")}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Reports")}
            style={styles.btnSecondary}
          >
            <Text style={styles.btnSecondaryText}>{t("navBtn2")}</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Divider ─── */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>
            {isRTL ? "ویژگی‌ها" : "Features"}
          </Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ─── Features ─── */}
        <View style={styles.features}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ─── About ─── */}
        <View style={styles.aboutCard}>
          {/* Gradient top accent */}
          <LinearGradient
            colors={[VIOLET, PINK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.aboutAccent}
          />

          <Text style={styles.aboutTitle}>{t("aboutTitle")}</Text>
          <Text style={[styles.aboutText, { textAlign: isRTL ? "right" : "left" }]}>
            {t("aboutText")}
          </Text>

          <View style={styles.missionRow}>
            <Text style={styles.missionDot}>✦</Text>
            <Text style={[styles.missionText, { textAlign: isRTL ? "right" : "left" }]}>
              {t("aboutMission")}
            </Text>
          </View>
        </View>

        {/* ─── Footer ─── */}
        <Text style={styles.footer}>© 2025 Sugar Admin</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },

  // Glows
  glowTopRight: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: VIOLET,
    opacity: 0.08,
    top: -80,
    right: -80,
  },
  glowBottomLeft: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: PINK,
    opacity: 0.06,
    bottom: 200,
    left: -80,
  },

  // Top bar
  topBar: {
    paddingTop: 56,
    paddingHorizontal: 24,
    alignItems: "flex-end",
  },
  langBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  langBtnText: {
    color: "#A78BFA",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 32,
  },
  appName: {
    color: WHITE,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 20,
    letterSpacing: 0.5,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: 28,
  },
  subtitleLine: {
    height: 1,
    width: 28,
    backgroundColor: "#7C3AED",
    opacity: 0.6,
  },
  appSubtitle: {
    color: "#A78BFA",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: WHITE,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 34,
    marginBottom: 12,
  },
  heroSub: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 24,
    paddingHorizontal: 8,
  },

  // Buttons
  btnGroup: {
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 36,
  },
  btnPrimaryWrap: {
    borderRadius: 16,
    overflow: "hidden",
  },
  btnPrimary: {
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 16,
  },
  btnPrimaryText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  btnSecondary: {
    paddingVertical: 15,
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  btnSecondaryText: {
    color: LIGHT,
    fontSize: 15,
    fontWeight: "600",
  },

  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  dividerLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 1,
  },

  // Features
  features: {
    paddingHorizontal: 24,
    gap: 4,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(124,58,237,0.12)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureIcon: {
    color: "#A78BFA",
    fontSize: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: LIGHT,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  featureDesc: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
  },

  // About
  aboutCard: {
    marginHorizontal: 24,
    backgroundColor: CARD,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 32,
  },
  aboutAccent: {
    height: 3,
    width: "100%",
  },
  aboutTitle: {
    color: WHITE,
    fontSize: 17,
    fontWeight: "700",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  aboutText: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 26,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  missionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "rgba(124,58,237,0.06)",
  },
  missionDot: {
    color: "#A78BFA",
    fontSize: 10,
  },
  missionText: {
    color: "#C4B5FD",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },

  // Footer
  footer: {
    color: "rgba(255,255,255,0.15)",
    fontSize: 12,
    textAlign: "center",
  },
});
