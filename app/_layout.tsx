import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationRouter } from "../hooks/useNotificationRouting";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <NotificationRouter />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ animation: "fade" }} />
        <Stack.Screen name="login" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="create-profile" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen
          name="emergency-request"
          options={{ animation: "slide_from_bottom", presentation: "modal" }}
        />
        <Stack.Screen name="request/[id]" options={{ animation: "slide_from_right" }} />
      </Stack>
    </QueryClientProvider>
  );
}
