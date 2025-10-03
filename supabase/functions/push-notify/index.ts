import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
type NotificationRow = {
  id: string;
  user_id: string; 
  actor_id: string;
  post_id: string | null;
  type: "like" | "comment";
  message: string;
  read: boolean;
  created_at: string;
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUSH_SHARED_SECRET = Deno.env.get("PUSH_SHARED_SECRET") ?? ""; 

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export default async (req: Request) => {
  try {
    const incoming = req.headers.get("x-push-secret") ?? "";
    if (PUSH_SHARED_SECRET && incoming !== PUSH_SHARED_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { notification_id } = await req.json();

    const { data: notif, error: notifErr } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notification_id)
      .single<NotificationRow>();
    if (notifErr || !notif) {
      console.error("notification fetch error", notifErr);
      return new Response("No notification", { status: 200 });
    }

    const { data: actor } = await supabase
      .from("profiles") 
      .select("username, avatar_url")
      .eq("id", notif.actor_id)
      .maybeSingle();

    const title =
      notif.type === "like"
        ? `${actor?.username ?? "Someone"} liked your post`
        : `${actor?.username ?? "Someone"} commented on your post`;

    const body =
      notif.type === "comment"
        ? notif.message || "New comment on your post"
        : notif.message || "New like on your post";

    const { data: devices, error: devErr } = await supabase
      .from("user_devices")
      .select("expo_push_token")
      .eq("user_id", notif.user_id)
      .eq("active", true);
    if (devErr || !devices?.length) {
      console.log("no active devices for recipient");
      return new Response("No devices", { status: 200 });
    }

    const messages = devices.map((d) => ({
      to: d.expo_push_token,
      sound: "default",
      title,
      body,
      data: {
        type: notif.type,
        postId: notif.post_id,
        actorId: notif.actor_id,
        notificationId: notif.id,
      },
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Expo push failed", res.status, json);
      return new Response("Expo push error", { status: 200 });
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("push-notify error", e);
    return new Response("ok", { status: 200 }); 
  }
};
