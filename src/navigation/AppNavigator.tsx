import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "../constants/colors";
import type { AppStackParamList } from "./types";

import HomeScreen      from "../screens/HomeScreen";
import DashboardScreen from "../features/dashboard/screens/DashboardScreen";
import ContentScreen   from "../features/content/screens/ContentScreen";
import ReportsScreen   from "../features/reports/screens/ReportsScreen";
import AIChatScreen    from "../features/ai-chat/screens/AIChatScreen";

const Stack = createNativeStackNavigator<AppStackParamList>();

const screenOptions = {
  headerStyle:      { backgroundColor: colors.surface },
  headerTintColor:  colors.textPrimary,
  headerTitleStyle: { fontWeight: "700" as const },
  contentStyle:     { backgroundColor: colors.bg },
};

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home"      component={HomeScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "داشبورد" }} />
      <Stack.Screen name="Content"   component={ContentScreen}   options={{ title: "مدیریت محتوا" }} />
      <Stack.Screen name="Reports"   component={ReportsScreen}   options={{ title: "گزارش‌ها" }} />
      <Stack.Screen name="AIChat"    component={AIChatScreen}    options={{ title: "دستیار هوشمند" }} />
    </Stack.Navigator>
  );
}
