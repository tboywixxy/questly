// app/(tabs)/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import CommentsModal from "../../components/CommentsModal";
import { supabase } from "../../src/services/supabase";
import { getBadge } from "../../src/utils/badges";
import { tinyTap } from "../../src/utils/haptics";

type FeedRow = {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  created_at: string;
  username: string | null;
  avatar_url: string | null;
  like_count: number;
  comment_count: number;
};

export default function FeedTab() {
  const router = useRouter();

  const [rows, setRows] = useState<FeedRow[]>([]);
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});
  const [authorTotals, setAuthorTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // unread count for the bell dot
  const [unread, setUnread] = useState(0);

  // comments modal
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activePost, setActivePost] = useState<FeedRow | null>(null);

  // avoid rapid double-like taps
  const likeLocks = useRef<Record<string, boolean>>({});

  const loadUnread = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setUnread(0);
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);
    if (!error) setUnread(count ?? 0);
  }, []);

  const loadFeed = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("post_feed").select("*").limit(200);
      if (error) throw error;

      const feed = (data as FeedRow[]) ?? [];
      setRows(feed);

      // preload likedByMe for current user
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (user && feed.length) {
        const ids = feed.map((r) => r.id);
        const { data: myLikes } = await supabase
          .from("post_likes")
          .select("post_id")
          .in("post_id", ids)
          .eq("user_id", user.id);

        const map: Record<string, boolean> = {};
        (myLikes ?? []).forEach((l: any) => (map[l.post_id] = true));
        setLikedByMe(map);
      } else {
        setLikedByMe({});
      }

      // totals for badges (per author on this page)
      const authorIds = Array.from(new Set(feed.map((p) => p.user_id)));
      if (authorIds.length) {
        const { data: totals } = await supabase
          .from("user_like_totals")
          .select("user_id,total_likes")
          .in("user_id", authorIds);

        const byId: Record<string, number> = {};
        (totals ?? []).forEach((t: any) => (byId[t.user_id] = t.total_likes));
        setAuthorTotals(byId);
      } else {
        setAuthorTotals({});
      }
    } catch (e: any) {
      console.log("Feed load error:", e?.message);
      Alert.alert("Error", "Failed to load feed");
    }
  }, []);

  const initialFetch = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadFeed(), loadUnread()]);
    setLoading(false);
  }, [loadFeed, loadUnread]);

  useEffect(() => {
    initialFetch();
  }, [initialFetch]);

  // refresh unread when returning to this screen
  useFocusEffect(
    useCallback(() => {
      loadUnread();
    }, [loadUnread])
  );

  // realtime: bump unread on inserts for me
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel("rt-unread-on-feed")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          () => setUnread((x) => x + 1)
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadFeed(), loadUnread()]);
    setRefreshing(false);
  }

  async function toggleLikeOptimistic(post: FeedRow) {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return Alert.alert("Login required", "Please sign in first.");
    if (likeLocks.current[post.id]) return;
    likeLocks.current[post.id] = true;

    const currentlyLiked = !!likedByMe[post.id];

    // tiny haptic immediately
    tinyTap();

    // optimistic UI
    setLikedByMe((prev) => ({ ...prev, [post.id]: !currentlyLiked }));
    setRows((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, like_count: Math.max(0, p.like_count + (currentlyLiked ? -1 : 1)) }
          : p
      )
    );
    setAuthorTotals((prev) => ({
      ...prev,
      [post.user_id]: Math.max(0, (prev[post.user_id] ?? 0) + (currentlyLiked ? -1 : 1)),
    }));

    try {
      if (currentlyLiked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_likes")
          .insert({ post_id: post.id, user_id: user.id });
        if (error) throw error;
      }
    } catch (e: any) {
      // revert on failure
      setLikedByMe((prev) => ({ ...prev, [post.id]: currentlyLiked }));
      setRows((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, like_count: Math.max(0, p.like_count + (currentlyLiked ? 1 : -1)) }
            : p
        )
      );
      setAuthorTotals((prev) => ({
        ...prev,
        [post.user_id]: Math.max(0, (prev[post.user_id] ?? 0) + (currentlyLiked ? 1 : -1)),
      }));
      Alert.alert("Error", e?.message ?? "Could not update like");
    } finally {
      likeLocks.current[post.id] = false;
    }
  }

  function openComments(post: FeedRow) {
    setActivePost(post);
    setCommentsOpen(true);
  }
  function closeComments() {
    setCommentsOpen(false);
  }
  function bumpCommentCount(delta: number) {
    if (!activePost) return;
    setRows((prev) =>
      prev.map((p) =>
        p.id === activePost.id
          ? { ...p, comment_count: Math.max(0, p.comment_count + delta) }
          : p
      )
    );
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 dark:bg-gray-900">
        <ActivityIndicator />
      </View>
    );
  }

  const empty = !rows || rows.length === 0;

  return (
    <View className="flex-1 bg-gray-100 dark:bg-gray-900">
      {/* Your own header row with title + bell on the right */}
      <View className="px-6 pt-6 pb-3 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">Feed</Text>

        <Pressable
          onPress={() => router.push("/notifications")}
          hitSlop={12}
          style={{ paddingHorizontal: 6, paddingVertical: 2 }}
        >
          <View>
            <Ionicons name="notifications-outline" size={24} color="#111827" />
            {unread > 0 && (
              <View
                style={{
                  position: "absolute",
                  right: -2,
                  top: -2,
                  width: 9,
                  height: 9,
                  borderRadius: 6,
                  backgroundColor: "#ef4444",
                }}
              />
            )}
          </View>
        </Pressable>
      </View>

      {empty ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500 dark:text-gray-400">No posts yet</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item }) => {
            const meLiked = !!likedByMe[item.id];
            const totalForAuthor = authorTotals[item.user_id] ?? 0;
            const badge = getBadge(totalForAuthor);

            return (
              <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden mb-4">
                {/* Header */}
                <View className="px-4 pt-4 pb-2">
                  <View className="flex-row items-center">
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} className="w-9 h-9 rounded-full mr-2" />
                    ) : (
                      <View className="w-9 h-9 rounded-full bg-gray-300 mr-2" />
                    )}
                    <Text className="text-gray-900 dark:text-white font-semibold">
                      {item.username || "User"}
                    </Text>
                    {badge && (
                      <View className={`ml-2 px-2 py-0.5 rounded-full ${badge.colorClass}`}>
                        <Text className="text-white text-xs font-bold">{badge.label}</Text>
                      </View>
                    )}
                  </View>

                  {!!item.content && (
                    <Text className="text-gray-700 dark:text-gray-300 mt-3" numberOfLines={6}>
                      {item.content}
                    </Text>
                  )}
                </View>

                {/* Fixed-height image for a consistent card look */}
                {item.media_url ? (
                  <Image
                    source={{ uri: item.media_url }}
                    className="w-full"
                    style={{ height: 260 }}
                    resizeMode="cover"
                  />
                ) : null}

                {/* Actions: counts BEFORE icons, no labels */}
                <View className="px-4 py-3 flex-row items-center">
                  {/* Likes */}
                  <View className="flex-row items-center mr-6">
                    <Text className="text-gray-900 dark:text-white mr-1">
                      {item.like_count}
                    </Text>
                    <TouchableOpacity
                      onPress={() => toggleLikeOptimistic(item)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700"
                      activeOpacity={0.9}
                    >
                      <Text className="text-gray-900 dark:text-white" aria-label="Like">
                        {meLiked ? "♥️" : "♡"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Comments */}
                  <View className="flex-row items-center">
                    <Text className="text-gray-900 dark:text-white mr-1">
                      {item.comment_count}
                    </Text>
                    <TouchableOpacity
                      onPress={() => openComments(item)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700"
                      activeOpacity={0.9}
                    >
                      <Text className="text-gray-900 dark:text-white" aria-label="Comments">💬</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Comments Modal */}
      <CommentsModal
        visible={commentsOpen}
        postId={activePost?.id ?? null}
        postPreview={activePost?.content ?? null}
        onClose={closeComments}
        onCommentCountChange={bumpCommentCount}
      />
    </View>
  );
}
