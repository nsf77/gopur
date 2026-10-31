import "../global.css";
import { useEffect, useSyncExternalStore } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { queryClient } from "../src/lib/query";
import { initTheme, resolveTheme, subscribeTheme, themePreference } from "../src/lib/theme";
import { GluestackUIProvider } from "../src/ui/gluestack";

export default function RootLayout() {
  const theme = useSyncExternalStore(subscribeTheme, () => resolveTheme(themePreference()), () => "light");
  useEffect(() => {
    void initTheme();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <GluestackUIProvider>
        <StatusBar style={theme === "dark" ? "light" : "dark" } />
        <Stack screenOptions={{ headerTintColor: "#304385", headerTitleStyle: { fontWeight: "700" } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login/index" options={{ title: "Gopur" }} />
          <Stack.Screen name="login/verify" options={{ title: "Gopur" }} />
          <Stack.Screen name="event/[id]/index" options={{ title: "Event" }} />
          <Stack.Screen name="event/[id]/edit" options={{ title: "Edit" }} />
          <Stack.Screen name="event/new" options={{ title: "New event" }} />
          <Stack.Screen name="chat/[id]" options={{ title: "Chat" }} />
          <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
          <Stack.Screen name="settings" options={{ title: "Settings" }} />
          <Stack.Screen name="profile/edit" options={{ title: "Edit profile" }} />
        </Stack>
      </GluestackUIProvider>
    </QueryClientProvider>
  );
}
