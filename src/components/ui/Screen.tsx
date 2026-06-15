import { View, ScrollView, StatusBar, ViewStyle } from "react-native";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
}

export default function Screen({ children, scroll = false, padded = true, style }: Props) {
  const { colors, isDark } = useTheme();
  const bg = colors.bg;

  const inner = (
    <View style={[{ flex: 1 }, padded && { padding: 20 }, style]}>
      {children}
    </View>
  );

  if (scroll) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: bg }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={bg} />
        {inner}
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={bg} />
      {inner}
    </View>
  );
}
