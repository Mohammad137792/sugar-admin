import { useState } from "react";
import { View, TextInput, Text, TouchableOpacity, StyleSheet, TextInputProps } from "react-native";
import { useTheme } from "../../context/ThemeContext";

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  secure?: boolean;
  isRTL?: boolean;
}

export default function Input({ label, error, secure = false, isRTL = false, ...rest }: Props) {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(secure);

  return (
    <View style={styles.wrap}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
          {label}
        </Text>
      )}
      <View style={[
        styles.inputRow,
        { backgroundColor: colors.surface, borderColor: error ? colors.error : colors.border },
      ]}>
        <TextInput
          style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? "right" : "left" }]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidden}
          {...rest}
        />
        {secure && (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} style={styles.eyeBtn}>
            <Text style={[styles.eyeIcon, { color: colors.textMuted }]}>{hidden ? "◉" : "○"}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={[styles.errorText, { color: colors.error, textAlign: isRTL ? "right" : "left" }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:      { gap: 6 },
  label:     { fontSize: 13, fontWeight: "600" },
  inputRow:  { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  input:     { flex: 1, fontSize: 15, paddingVertical: 13 },
  eyeBtn:    { padding: 8 },
  eyeIcon:   { fontSize: 14 },
  errorText: { fontSize: 12 },
});
