import { useCallback, useEffect, useState } from "react";
import { FlatList, Image, RefreshControl, Text, View } from "react-native";
import { supabase } from "../../src/services/supabase";
import { getBadge } from "../../src/utils/badges";

type Row = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  total_likes: number;
};

export default function LeaderboardTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBoard = useCallback(async () => {
    const { data, error } = await supabase
      .from("user_like_totals") // <- all-time totals (not weekly)
      .select("*")
      .order("total_likes", { ascending: false })
      .limit(100);
    if (!error && data) setRows(data as Row[]);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadBoard();
      setLoading(false);
    })();

    // Realtime auto-update when likes change
    const channel = supabase
      .channel("rt-leaderboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_likes" },
        async () => {
          await loadBoard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadBoard]);

  async function onRefresh() {
    setRefreshing(true);
    await loadBoard();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 dark:bg-gray-900">
        <Text className="text-gray-500 dark:text-gray-400">Loading…</Text>
      </View>
    );
  }

  const empty = !rows || rows.length === 0;

  return (
    <View className="flex-1 bg-gray-100 dark:bg-gray-900 px-6 pt-6">
      <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Leaderboard
      </Text>

      {empty ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500 dark:text-gray-400">No leaderboard scores</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.user_id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item, index }) => {
            const badge = getBadge(item.total_likes);

            return (
              <View className="flex-row items-center bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3">
                {/* Rank */}
                <Text className="w-8 text-center text-gray-500">{index + 1}</Text>

                {/* Avatar */}
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} className="w-10 h-10 rounded-full mr-3" />
                ) : (
                  <View className="w-10 h-10 rounded-full bg-gray-300 mr-3" />
                )}

                {/* Username & likes (left) */}
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-white font-semibold">
                    {item.username || "User"}
                  </Text>
                  <Text className="text-gray-500">{item.total_likes} likes</Text>
                </View>

                {/* Badge on the RIGHT */}
                {badge && (
                  <View className={`px-2 py-0.5 rounded-full ${badge.colorClass}`}>
                    <Text className="text-white text-xs font-bold">{badge.label}</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
