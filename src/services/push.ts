import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

export async function registerForPushTokens() {
  if (Constants.appOwnership === "expo") {
    console.warn("Push tokens are not available in Expo Go (SDK 53+). Build a dev client.");
    return null;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync(
    PROJECT_ID ? { projectId: PROJECT_ID } : undefined
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (user && token) {
    await supabase.from("device_tokens").upsert({ user_id: user.id, expo_token: token });
  }
  return token;
}
