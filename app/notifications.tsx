import { useEffect, useState } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { supabase } from "../src/services/supabase";

type Notification = {
  id: string;
  user_id: string;
  actor_id: string;
  post_id: string | null;
  type: "like" | "comment";
  message: string;
  read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const [rows, setRows] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setRows([]);

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) setRows(data as Notification[]);
  }

  useEffect(() => {
    load();

    // realtime: only insert for my user
    const channel = supabase
      .channel("rt-notifications-page")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        async (payload) => {
          const n = payload.new as Notification;
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id === n.user_id) {
            setRows((prev) => [n, ...prev]);
          }
        }
      )
      .subscribe();

    // mark all as read when opening the page
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("user_id", user.id)
          .eq("read", false);
      }
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const empty = rows.length === 0;

  return (
    <View className="flex-1 bg-gray-100 dark:bg-gray-900 px-6 pt-6">
      {empty ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500 dark:text-gray-400">No notifications</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(n) => n.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View
              className={`rounded-2xl p-4 mb-3 ${
                item.read ? "bg-gray-50 dark:bg-gray-800/70" : "bg-white dark:bg-gray-800"
              }`}
            >
              <Text className="text-gray-900 dark:text-white">{item.message}</Text>
              <Text className="text-[11px] text-gray-500 mt-1">
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
