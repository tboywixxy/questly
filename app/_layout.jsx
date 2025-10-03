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
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { saveExpoPushToken } from "../src/utils/pushToken";


async function registerForPushNotificationsAsync() {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        sound: "default",
        bypassDnd: false,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notifications permission not granted.");
      return null;
    }

    const expoConfig = (Constants && Constants.expoConfig) || {};
    const extra = expoConfig.extra || {};
    const projectId =
      extra.EXPO_PUBLIC_EAS_PROJECT_ID ||
      (extra.eas && extra.eas.projectId) ||
      expoConfig.projectId ||
      undefined;

    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = (tokenResponse && tokenResponse.data) || null;
    return token;
  } catch (err) {
    console.log("registerForPushNotificationsAsync error:", err);
    return null;
  }
}

/* ---------------- Foreground notification behavior ---------------- */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/* ---------------- Themed stack ---------------- */
function ThemedStack() {
  const isDark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();

  const GRAY_900 = "#111827";

  const pageBg = isDark ? GRAY_900 : "#fff";
  const headerBg = pageBg;
  const headerTint = isDark ? "#FFFFFF" : "#000000";

  const ANDROID_EXTRA = 1;

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (!mounted) return;
        if (token) {
          await saveExpoPushToken(token);
        }
      } catch (e) {
        console.log("Push token error:", e);
      }
    })();

    const receivedSub = Notifications.addNotificationReceivedListener(() => {
    });

    const responseSub =
      Notifications.addNotificationResponseReceivedListener(() => {
      });

    return () => {
      mounted = false;
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />

      <Stack
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

        {/* Tabs group (headerless) -> top safe area + bottom inset */}
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
            headerTitle: "",
            headerShadowVisible: false,
            contentStyle: { backgroundColor: pageBg },
          }}
        />

        <Stack.Screen
          name="edit"
          options={{
            title: "Edit",
            headerBackTitle: "",
            contentStyle: { backgroundColor: pageBg },
          }}
        />

        <Stack.Screen
          name="support"
          options={{
            headerShown: true,
            headerTitle: "",
            headerShadowVisible: false,
            contentStyle: { backgroundColor: "transparent" },
          }}
        />

        <Stack.Screen
          name="password"
          options={{
            headerShown: true,
            headerTitle: "",
            headerShadowVisible: false,
            contentStyle: { backgroundColor: pageBg },
          }}
        />

        <Stack.Screen
          name="user/[id]"
          options={{
            headerShown: true,
            headerTitle: "",
            headerShadowVisible: false,
            contentStyle: { backgroundColor: pageBg },
          }}
        />

        <Stack.Screen
          name="[postedId]"
          options={{
            headerShown: true,
            headerTitle: "",
            headerShadowVisible: false,
            contentStyle: { backgroundColor: pageBg },
          }}
        />

        <Stack.Screen
          name="profile"
          options={{
            headerShown: true,
            headerTitle: "",
            headerShadowVisible: false,
            contentStyle: { backgroundColor: pageBg },
          }}
        />
      </Stack>
    </>
  );
}

/* ---------------- Root ---------------- */
export default function RootLayout() {
  return (
    <NotificationProvider>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemedStack />
      </SafeAreaProvider>
    </NotificationProvider>
  );
}
