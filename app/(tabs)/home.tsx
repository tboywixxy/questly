// app/(tabs)/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  Alert,
  Platform,
} from "react-native";
import CommentsModal from "../../components/CommentsModal";
import { supabase } from "../../src/services/supabase";
import { getBadge } from "../../src/utils/badges";
import { tinyTap } from "../../src/utils/haptics";

/* ----------------------------- ASSETS ---------------------------- */
const LOGO_LIGHT = require("../../assets/images/logo-em-bg-black.png"); // light mode
const LOGO_DARK = require("../../assets/images/logo-rm-bg-light.png"); // dark mode

/* ----------------------------- TYPES ----------------------------- */
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
  place_name: string | null;
};

/* --------------------------- THEME UTILS ------------------------- */
function useTheme() {
  const isDark = useColorScheme() === "dark";
  return {
    isDark,
    C: {
      pageBg: isDark ? "#0B1220" : "#F5F7FB",
      cardBg: isDark ? "#111827" : "#FFFFFF",
      cardAlt: isDark ? "#0F172A" : "#F1F5F9",
      textPri: isDark ? "#F9FAFB" : "#0F172A",
      textSec: isDark ? "#C2C8D6" : "#5B6474",
      hair: isDark ? "#1F2937" : "#E6E8EF",
      border: isDark ? "#253047" : "#E5E7EB",
      accent: "#2563EB",
      danger: "#EF4444",
      likePill: isDark ? "#1F2937" : "#EFF4FB",
    },
  };
}

/* --------------------------- TIME AGO ---------------------------- */
function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w}w`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  const y = Math.floor(d / 365);
  return `${y}y`;
}

/* ------------------------- SKELETON PIECES ----------------------- */
function Shimmer({
  width,
  height,
  radius = 8,
}: {
  width: number | string;
  height: number;
  radius?: number;
}) {
  const { C } = useTheme();
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shine, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shine]);

  const translateX = shine.interpolate({ inputRange: [0, 1], outputRange: [-100, 300] });

  return (
    <View style={{ width, height, borderRadius: radius, backgroundColor: C.hair, overflow: "hidden" }}>
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 80,
          transform: [{ translateX }],
          opacity: 0.25,
          backgroundColor: "#FFFFFF",
        }}
      />
    </View>
  );
}

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  const { C } = useTheme();
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 300,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [appear, delay]);

  return (
    <Animated.View
      style={{
        opacity: appear,
        transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        backgroundColor: C.cardBg,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: C.border,
        padding: 14,
        marginBottom: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Shimmer width={40} height={40} radius={20} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Shimmer width="40%" height={14} />
          <View style={{ height: 6 }} />
          <Shimmer width="25%" height={10} />
        </View>
      </View>

      <View style={{ height: 10 }} />

      <Shimmer width="90%" height={12} />
      <View style={{ height: 6 }} />
      <Shimmer width="70%" height={12} />

      <View style={{ height: 10 }} />

      <Shimmer width="100%" height={220} radius={12} />

      <View style={{ height: 12 }} />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Shimmer width={60} height={26} radius={8} />
        <Shimmer width={80} height={26} radius={8} />
      </View>
    </Animated.View>
  );
}

/* ----------------------- MEDIA (NO-CROP) VIEW -------------------- */
function MediaView({ uri }: { uri: string }) {
  const { C } = useTheme();
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    Image.getSize(
      uri,
      (w, h) => mounted && setRatio(w > 0 && h > 0 ? w / h : 1),
      () => mounted && setRatio(1)
    );
    return () => {
      mounted = false;
    };
  }, [uri]);

  const effectiveRatio = (() => {
    const r = ratio ?? 1;
    const MIN = 0.6;
    const MAX = 1.6;
    return Math.min(Math.max(r, MIN), MAX);
  })();

  return (
    <View
      style={{
        width: "100%",
        aspectRatio: effectiveRatio,
        backgroundColor: C.cardAlt,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
    </View>
  );
}

/* ---------------------------- FEED CARD -------------------------- */
function FeedCard({
  item,
  meLiked,
  onToggleLike,
  onOpenComments,
  index,
  onPressUser,
}: {
  item: FeedRow;
  meLiked: boolean;
  onToggleLike: (post: FeedRow) => void;
  onOpenComments: (post: FeedRow) => void;
  index: number;
  onPressUser: (userId: string) => void;
}) {
  const { C } = useTheme();
  const badge = getBadge(item.like_count);

  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      delay: 70 * index,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  const likeScale = useRef(new Animated.Value(1)).current;
  const commentScale = useRef(new Animated.Value(1)).current;
  const pressIn = (v: Animated.Value) =>
    Animated.timing(v, { toValue: 0.94, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  const pressOut = (v: Animated.Value) =>
    Animated.timing(v, { toValue: 1, duration: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

  return (
    <Animated.View
      style={{
        transform: [
          { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
          { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
        ],
        opacity: enter,
        backgroundColor: C.cardBg,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: C.border,
        marginBottom: 14,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable onPress={() => onPressUser(item.user_id)}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} />
            ) : (
              <View style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10, backgroundColor: C.hair }} />
            )}
          </Pressable>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
              <Pressable onPress={() => onPressUser(item.user_id)}>
                <Text style={{ color: C.textPri, fontWeight: "700" }}>{item.username || "User"}</Text>
              </Pressable>
              {badge && (
                <View
                  style={{
                    marginLeft: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 999,
                    backgroundColor: "#111827",
                  }}
                >
                  <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "800" }}>{badge.label}</Text>
                </View>
              )}
            </View>

            {!!item.place_name && <Text style={{ color: C.textSec, fontSize: 12, marginTop: 2 }}>📍 {item.place_name}</Text>}
          </View>
        </View>

        {!!item.content && (
          <Text style={{ color: C.textPri, opacity: 0.9, marginTop: 8, lineHeight: 20 }} numberOfLines={6}>
            {item.content}
          </Text>
        )}
      </View>

      {/* Media */}
      {!!item.media_url && <MediaView uri={item.media_url} />}

      {/* Actions */}
      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6, flexDirection: "row", alignItems: "center" }}>
        {/* Likes */}
        <Animated.View style={{ transform: [{ scale: likeScale }] }}>
          <TouchableOpacity
            onPressIn={() => pressIn(likeScale)}
            onPressOut={() => pressOut(likeScale)}
            onPress={() => onToggleLike(item)}
            activeOpacity={0.9}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: C.likePill,
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 10,
              marginRight: 12,
            }}
          >
            <Text style={{ color: C.textPri, fontWeight: "700", marginRight: 6 }}>{item.like_count}</Text>
            <Text style={{ color: C.textPri }}>{meLiked ? "♥️" : "♡"}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Comments */}
        <Animated.View style={{ transform: [{ scale: commentScale }] }}>
          <TouchableOpacity
            onPressIn={() => pressIn(commentScale)}
            onPressOut={() => pressOut(commentScale)}
            onPress={() => onOpenComments(item)}
            activeOpacity={0.9}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: C.likePill,
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: C.textPri, fontWeight: "700", marginRight: 6 }}>{item.comment_count}</Text>
            <Text style={{ color: C.textPri }}>💬</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Time-ago */}
      <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
        <Text style={{ color: C.textSec, fontSize: 12 }}>{timeAgo(item.created_at)} ago</Text>
      </View>
    </Animated.View>
  );
}

/* ------------------------------ MAIN ------------------------------ */
export default function FeedTab() {
  const router = useRouter();
  const { C, isDark } = useTheme();
  const iconColor = isDark ? "#FFFFFF" : "#111827";

  const [rows, setRows] = useState<FeedRow[]>([]);
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);
  const [myId, setMyId] = useState<string | null>(null);

  // iOS sheet state
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activePost, setActivePost] = useState<FeedRow | null>(null);

  const likeLocks = useRef<Record<string, boolean>>({});

  const loadUnread = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setMyId(user?.id ?? null);
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

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      setMyId(user?.id ?? null);

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

  useFocusEffect(
    useCallback(() => {
      loadUnread();
      return undefined;
    }, [loadUnread])
  );

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setMyId(user?.id ?? null);
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

    tinyTap();

    // optimistic update
    setLikedByMe((prev) => ({ ...prev, [post.id]: !currentlyLiked }));
    setRows((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, like_count: Math.max(0, p.like_count + (currentlyLiked ? -1 : 1)) } : p))
    );

    try {
      if (currentlyLiked) {
        const { error } = await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
        if (error) throw error;
      }
    } catch (e: any) {
      // revert on failure
      setLikedByMe((prev) => ({ ...prev, [post.id]: currentlyLiked }));
      setRows((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, like_count: Math.max(0, p.like_count + (currentlyLiked ? 1 : -1)) } : p
        )
      );
      Alert.alert("Error", e?.message ?? "Could not update like");
    } finally {
      likeLocks.current[post.id] = false;
    }
  }

function openComments(post: FeedRow) {
  if (Platform.OS === "android") {
    // ✅ put the id in the path; pass preview as query
    const preview = encodeURIComponent(post.content ?? "");
    router.push(`/comments/${post.id}?preview=${preview}`);
  } else {
    setActivePost(post);
    setCommentsOpen(true);
  }
  }
  function closeComments() {
    setCommentsOpen(false);
  }
  function bumpCommentCount(delta: number) {
    setRows((prev) =>
      prev.map((p) => (activePost && p.id === activePost.id ? { ...p, comment_count: Math.max(0, p.comment_count + delta) } : p))
    );
  }

  // Route to user page or my own profile
  const onPressUser = useCallback(
    (userId: string) => {
      if (myId && userId === myId) {
        router.push("/profile"); // own profile
      } else {
        router.push(`/user/${userId}`); // public profile
      }
    },
    [router, myId]
  );

  const empty = !rows || rows.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      {/* Header: logo + title + bell */}
      <View
        style={{
          paddingHorizontal: 8,
          paddingTop: 2,
          paddingBottom: 6,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: logo + title/subtitle */}
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Image
            source={isDark ? LOGO_DARK : LOGO_LIGHT}
            resizeMode="contain"
            style={{ width: 68, height: 68, marginRight: 0, borderRadius: 6 }}
          />
          <View style={{ flexShrink: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: "800", color: C.textPri }}>Feed</Text>
            <Text style={{ color: C.textSec, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
              Welcome back 👋
            </Text>
          </View>
        </View>

        {/* Right: notifications bell */}
        <Pressable onPress={() => router.push("/notifications")} hitSlop={12} style={{ paddingHorizontal: 6, paddingVertical: 2 }}>
          <View>
            <Ionicons name="notifications-outline" size={24} color={isDark ? "#FFFFFF" : "#111827"} />
            {unread > 0 && <View style={{ position: "absolute", right: -2, top: -2, width: 9, height: 9, borderRadius: 6, backgroundColor: C.danger }} />}
          </View>
        </Pressable>
      </View>

      {/* Loading / Empty / Feed */}
      {loading ? (
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 10 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} delay={i * 90} />
          ))}
        </View>
      ) : empty ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: C.textSec }}>No posts yet</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 80 }}
          renderItem={({ item, index }) => (
            <FeedCard
              item={item}
              index={index}
              meLiked={!!likedByMe[item.id]}
              onToggleLike={toggleLikeOptimistic}
              onOpenComments={openComments}
              onPressUser={onPressUser}
            />
          )}
        />
      )}

      {/* iOS-only comments sheet */}
      {Platform.OS === "ios" && (
        <CommentsModal
          visible={commentsOpen}
          postId={activePost?.id ?? null}
          postPreview={activePost?.content ?? null}
          onClose={closeComments}
          onCommentCountChange={bumpCommentCount}
        />
      )}
    </View>
  );
}
