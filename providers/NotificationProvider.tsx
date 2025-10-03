import { Platform } from "react-native";
...
useEffect(() => {
  let mounted = true;

  registerForPushNotificationsAsync()
    .then(async (t) => {
      if (!mounted) return;
      setExpoPushToken(t);

      const { data: { user } } = await supabase.auth.getUser();
      if (user && t) {
        await supabase
          .from("user_devices")
          .upsert({
            user_id: user.id,
            expo_push_token: t,
            platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web",
            active: true,
            last_seen: new Date().toISOString(),
          }, { onConflict: "user_id,expo_push_token" });
      }
    })
    .catch((e) => setError(e instanceof Error ? e : new Error(String(e))));
...
}, []);
