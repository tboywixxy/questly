// app/comments/[postId].tsx
import { useLocalSearchParams, useNavigation, usePathname } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Keyboard,
  Image,
  Platform,
  useColorScheme,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/services/supabase";

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

/* ------------------------------ TYPES ---------------------------- */
type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string | null;
  avatar_url: string | null;
};

/* ----------------------------- SCREEN ---------------------------- */
export default function CommentsScreen() {
  // Normalize route params
  const raw = useLocalSearchParams();
  const path = usePathname();
  const routePostId = Array.isArray(raw.postId) ? raw.postId[0] : (raw.postId as string | undefined);
  const routePreview = Array.isArray(raw.preview) ? raw.preview[0] : (raw.preview as string | undefined);
  const derivedFromPath = (() => {
    const m = path?.match(/\/comments\/([^/?#]+)/);
    return m?.[1];
  })();
  const effectivePostId = routePostId || derivedFromPath;
  const preview = routePreview;

  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";

  // Hide native header; we’ll render our own custom top bar
  useEffect(() => {
    nav.setOptions?.({ headerShown: false, title: "" });
  }, [nav]);

  const COLORS = {
    bg: isDark ? "#0B1220" : "#F5F7FB",
    card: isDark ? "#111827" : "#FFFFFF",
    text: isDark ? "#E5E7EB" : "#111827",
    sub: isDark ? "#9CA3AF" : "#6B7280",
    border: isDark ? "#253047" : "#E5E7EB",
    inputBg: isDark ? "#1F2937" : "#F3F4F6",
    inputText: isDark ? "#F9FAFB" : "#111827",
    sendBg: "#2563EB",
    danger: "#EF4444",
    icon: isDark ? "#F9FAFB" : "#111827",
    headerBg: isDark ? "#0B1220" : "#F5F7FB",
  };

  const [text, setText] = useState("");
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const listRef = useRef<FlatList<CommentRow>>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Layout
  const COMPOSER_H = 56;
  const bottomPad = useMemo(() => Math.max(insets.bottom, 12), [insets.bottom]);
  const listBottomPadding = COMPOSER_H + bottomPad + 16;

  /* ------------------------------ LOAD ------------------------------ */
  async function load() {
    if (!effectivePostId) {
      console.warn("[Comments] No postId param. Path:", path);
      setRows([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("comments_feed")
      .select("*")
      .eq("post_id", effectivePostId)
      .order("created_at", { ascending: false }); // newest first
    setLoading(false);

    if (error) {
      console.error("[Comments] load error:", error);
      Alert.alert("Error", "Could not load comments.");
      return;
    }

    setRows((data as CommentRow[]) ?? []);
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: false }));
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  /* ------------------------------ AUTH ------------------------------ */
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error) console.warn("[Comments] getUser error:", error.message);
      setUid(data?.user?.id ?? null);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------------------- REALTIME ---------------------------- */
  useEffect(() => {
    load();
    if (!effectivePostId) return;

    const ch = supabase
      .channel(`rt-comments-${effectivePostId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "post_comments", filter: `post_id=eq.${effectivePostId}` },
        async (payload) => {
          const rec = payload.new as { id: string };
          const { data, error } = await supabase
            .from("comments_feed")
            .select("*")
            .eq("id", rec.id)
            .single();
          if (error) {
            console.warn("[Comments] realtime fetch single error:", error.message);
            return;
          }
          if (data) {
            setRows((prev) => [data as CommentRow, ...prev]);
            requestAnimationFrame(() =>
              listRef.current?.scrollToOffset({ offset: 0, animated: true })
            );
          }
        }
      )
      .subscribe();

    channelRef.current = ch;
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [effectivePostId]);

  /* ------------------------------ SEND ------------------------------ */
  async function send() {
    const content = text.trim();
    if (!effectivePostId) {
      Alert.alert("Error", "Missing post ID.");
      return;
    }
    if (!uid) {
      Alert.alert("Login required", "Please sign in to comment.");
      return;
    }
    if (!content) return;

    // Optimistically clear input
    setText("");
    Keyboard.dismiss();

    const { error } = await supabase
      .from("post_comments")
      .insert({ post_id: effectivePostId, user_id: uid, content });

    if (error) {
      console.error("[Comments] send error:", error);
      Alert.alert("Error", error.message || "Could not send comment.");
      // restore text so user doesn't lose it
      setText(content);
    }
  }

  /* ----------------------------- AVATAR ----------------------------- */
  function Avatar({ name, uri }: { name?: string | null; uri?: string | null }) {
    if (uri) {
      return <Image source={{ uri }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12 }} />;
    }
    const initials =
      (name ?? "U")
        .split(" ")
        .map((s) => s[0]?.toUpperCase())
        .slice(0, 2)
        .join("") || "U";
    return (
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          marginRight: 12,
          backgroundColor: "#D1D5DB",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151" }}>{initials}</Text>
      </View>
    );
  }

  /* ------------------------------ UI ------------------------------ */
  if (!effectivePostId) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg }}>
        <Text style={{ color: COLORS.danger, padding: 16, fontWeight: "700" }}>Error: missing post ID.</Text>
        <Text style={{ opacity: 0.7, color: COLORS.sub }}>Path: {path}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* ---- Top Bar: Back + Title ---- */}
      <View
        style={{
          paddingTop: Math.max(insets.top * 0.2, 0),
          paddingHorizontal: 12,
          paddingBottom: 8,
          backgroundColor: COLORS.headerBg,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <Pressable onPress={() => (nav as any).goBack?.()} hitSlop={10} style={{ padding: 6, marginRight: 6 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.icon} />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.text }}>Comments</Text>
      </View>

      {/* Optional post preview (2–3 lines) */}
      {!!preview && (
        <Text
          numberOfLines={3}
          style={{ color: COLORS.sub, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}
        >
          {preview}
        </Text>
      )}

      {/* Comments list (newest first) */}
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(i) => i.id}
        keyboardDismissMode={Platform.select({ ios: "interactive", android: "on-drag" })}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: listBottomPadding }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.sub}
            colors={[COLORS.sub]}
          />
        }
        renderItem={({ item }) => (
          <View style={{ flexDirection: "row", marginBottom: 12 }}>
            <Avatar name={item.username} uri={item.avatar_url ?? undefined} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.text }}>
                {item.username ?? "User"}
              </Text>
              <Text style={{ fontSize: 15, marginTop: 4, color: COLORS.text }}>
                {item.content}
              </Text>
              <Text style={{ fontSize: 11, marginTop: 4, color: COLORS.sub }}>
                {timeAgo(item.created_at)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={{ padding: 24 }}>
              <Text style={{ color: COLORS.sub }}>No comments yet.</Text>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 8 }} />}
      />

      {/* Fixed composer */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: bottomPad,
          paddingTop: 8,
          paddingHorizontal: 16,
          height: COMPOSER_H + bottomPad + 8,
          backgroundColor: COLORS.card,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          zIndex: 10,
          elevation: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write a comment…"
            multiline
            style={{
              flex: 1,
              maxHeight: 120,
              color: COLORS.inputText,
              backgroundColor: COLORS.inputBg,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
            placeholderTextColor={COLORS.sub}
            // On Android, onSubmitEditing doesn't fire with multiline. Use the Send button.
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={send}
            style={{
              marginLeft: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 16,
              backgroundColor: COLORS.sendBg,
            }}
            activeOpacity={0.9}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
