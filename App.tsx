import "./global.css";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider, useLanguage } from "./src/context/LanguageContext";
import AppNavigator from "./src/navigation/AppNavigator";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 1000 * 60 * 5 },
  },
});

function Root() {
  const { isRTL } = useLanguage();
  return (
    <View style={{ flex: 1, direction: isRTL ? "rtl" : "ltr" }}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <Root />
      </LanguageProvider>
    </QueryClientProvider>
  );
}
