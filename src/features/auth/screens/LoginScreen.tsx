import { View, Text, StyleSheet, ScrollView } from "react-native";
import { colors } from "../../../constants/colors";
import { Button, Input } from "../../../components/ui";
import { useLanguage } from "../../../context/LanguageContext";

export default function LoginScreen() {
  const { isRTL } = useLanguage();
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>
        {isRTL ? "ورود به حساب" : "Sign In"}
      </Text>
      <Text style={[styles.sub, { textAlign: isRTL ? "right" : "left" }]}>
        {isRTL ? "خوش آمدید به شوگر ادمین" : "Welcome back to Sugar Admin"}
      </Text>
      <View style={styles.form}>
        <Input label={isRTL ? "ایمیل" : "Email"}    placeholder="you@example.com" isRTL={isRTL} keyboardType="email-address" />
        <Input label={isRTL ? "رمز عبور" : "Password"} placeholder="••••••••" secure isRTL={isRTL} />
        <Button label={isRTL ? "ورود" : "Sign In"} onPress={() => {}} style={styles.btn} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingTop: 60 },
  title:   { color: colors.textPrimary, fontSize: 28, fontWeight: "800", marginBottom: 6 },
  sub:     { color: colors.textMuted, fontSize: 14, marginBottom: 36 },
  form:    { gap: 16 },
  btn:     { marginTop: 8 },
});
