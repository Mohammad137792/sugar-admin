import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../context/ThemeContext";
import type { AppStackParamList } from "./types";

import HomeScreen      from "../screens/HomeScreen";
import DashboardScreen from "../features/dashboard/screens/DashboardScreen";
import ContentScreen   from "../features/content/screens/ContentScreen";
import ReportsScreen   from "../features/reports/screens/ReportsScreen";
import AIChatScreen    from "../features/ai-chat/screens/AIChatScreen";

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:      { backgroundColor: colors.surface },
        headerTintColor:  colors.textPrimary,
        headerTitleStyle: { fontWeight: "700" as const, color: colors.textPrimary },
        contentStyle:     { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="Home"      component={HomeScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "داشبورد" }} />
      <Stack.Screen name="Content"   component={ContentScreen}   options={{ title: "مدیریت محتوا" }} />
      <Stack.Screen name="Reports"   component={ReportsScreen}   options={{ title: "گزارش‌ها" }} />
      <Stack.Screen name="AIChat"    component={AIChatScreen}    options={{ title: "دستیار هوشمند" }} />
    </Stack.Navigator>
  );
}
