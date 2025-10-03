import { Platform } from "react-native";
import { supabase } from "../services/supabase";

export async function saveExpoPushToken(token: string) {
  if (!token) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_devices")
    .upsert(
      {
        user_id: user.id,
        expo_push_token: token,
        platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web",
        active: true,
        last_seen: new Date().toISOString(),
      },
      { onConflict: "user_id,expo_push_token" } 
    );
}
