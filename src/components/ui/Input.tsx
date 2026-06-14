import { useState } from "react";
import { View, TextInput, Text, TouchableOpacity, StyleSheet, TextInputProps } from "react-native";
import { colors } from "../../constants/colors";

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  secure?: boolean;
  isRTL?: boolean;
}

export default function Input({ label, error, secure = false, isRTL = false, ...rest }: Props) {
  const [hidden, setHidden] = useState(secure);

  return (
    <View style={styles.wrap}>
      {label && (
        <Text style={[styles.label, { textAlign: isRTL ? "right" : "left" }]}>{label}</Text>
      )}
      <View style={[styles.inputRow, error && styles.inputError]}>
        <TextInput
          style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidden}
          {...rest}
        />
        {secure && (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} style={styles.eyeBtn}>
            <Text style={styles.eyeIcon}>{hidden ? "◉" : "○"}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={[styles.errorText, { textAlign: isRTL ? "right" : "left" }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:       { gap: 6 },
  label:      { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    paddingVertical: 13,
  },
  inputError: { borderColor: colors.error },
  eyeBtn:     { padding: 8 },
  eyeIcon:    { color: colors.textMuted, fontSize: 14 },
  errorText:  { color: colors.error, fontSize: 12 },
});
