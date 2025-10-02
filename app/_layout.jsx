// app/_layout.tsx
import * as React from "react";
import { Stack } from "expo-router";
import { useColorScheme, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import "../global.css";
import { NotificationProvider } from "@/src/contexts/NotificationContext";
import * as Notifications from 'expo-notifications';

function ThemedStack() {
  const isDark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();

  // Tailwind grays
  const GRAY_100 = "#F3F4F6"; // bg-gray-100
  const GRAY_900 = "#111827"; // bg-gray-900

  const pageBg = isDark ? GRAY_900 : GRAY_100;
  const headerBg = pageBg;
  const headerTint = isDark ? "#FFFFFF" : "#000000";

  // --- Minimal Android-only extra space under tabs (prevents overlap) ---
  const ANDROID_EXTRA = 1; // small cushion; tweak if needed

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />

      <Stack
        // Default: NO extra padding applied globally
        screenOptions={{
          headerShown: false,
          headerBackTitleVisible: false,
          headerBackButtonDisplayMode: "minimal",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: headerBg },
          headerTintColor: headerTint,
          headerTitleStyle: { color: headerTint },
          contentStyle: { backgroundColor: pageBg },
        }}
      >
        {/* Auth group (headerless) -> add ONLY top safe area */}
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
            contentStyle: {
              backgroundColor: pageBg,
              paddingTop: insets.top,
            },
          }}
        />

        {/* Tabs group (headerless) -> top safe area + bottom inset (Android gets a tiny extra) */}
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            title: " ",
            contentStyle: {
              backgroundColor: pageBg,
              paddingTop: insets.top,
              paddingBottom:
                insets.bottom + (Platform.OS === "android" ? ANDROID_EXTRA : 0),
            },
          }}
        />

        {/* Standalone pages WITH headers -> no extra top padding */}
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: true,
            headerTitle: "Notifications",
            headerShadowVisible: false,
            contentStyle: {
              backgroundColor: pageBg,
              // no paddingTop here (header already clears status bar)
            },
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            headerShown: true,
            headerTitle: "Edit Profile",
            headerShadowVisible: false,
            contentStyle: {
              backgroundColor: pageBg,
              // no paddingTop here
            },
          }}
        />
      </Stack>
    </>
  );
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true
  }),
})

export default function RootLayout() {
  return (
    <NotificationProvider>
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemedStack />
    </SafeAreaProvider>
    </NotificationProvider>
  );
}
