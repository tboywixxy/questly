// components/CommentsModal.tsx
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
} from "react-native";
import ActionSheet, { useScrollHandlers } from "react-native-actions-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../src/services/supabase";

type Props = {
  visible: boolean;
  postId: string | null;
  postPreview?: string | null;
  onClose: () => void;
  onCommentCountChange?: (delta: number) => void;
};

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string | null;
  avatar_url: string | null;
};

export default function CommentsModal({
  visible,
  postId,
  postPreview,
  onClose,
  onCommentCountChange,
}: Props) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [uid, setUid] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const sheetRef = useRef<ActionSheet>(null);
  const listRef = useRef<FlatList<CommentRow>>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Composer height (fixed) + safe bottom
  const COMPOSER_H = 56;
  const bottomPad = useMemo(() => Math.max(insets.bottom, 12), [insets.bottom]);
  const listBottomPadding = COMPOSER_H + bottomPad + 16; // space so list won't hide behind composer

  const scrollHandlers = useScrollHandlers("comments-sheet", listRef, () => {});

  async function load() {
    if (!postId) return setRows([]);
    const { data, error } = await supabase
      .from("comments_feed")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!error && data) setRows(data as CommentRow[]);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setUid(user?.id ?? null);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (visible && postId) {
      sheetRef.current?.show();
      load();

      const ch = supabase
        .channel(`rt-comments-${postId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` },
          async (payload) => {
            const rec = payload.new as { id: string };
            const { data } = await supabase
              .from("comments_feed")
              .select("*")
              .eq("id", rec.id)
              .single();
            if (data) {
              setRows((prev) => [...prev, data as CommentRow]);
              onCommentCountChange?.(1);
              requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
            }
          }
        )
        .subscribe();

      channelRef.current = ch;
    } else {
      sheetRef.current?.hide();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, postId]);

  async function send() {
    if (!postId || !uid || !text.trim()) return;
    const content = text.trim();
    setText("");
    Keyboard.dismiss();

    const { error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, user_id: uid, content });

    if (error) {
      // restore on failure
      setText(content);
    }
  }

  function handleClose() {
    Keyboard.dismiss();
    onClose();
  }

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
        style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12 }}
        className="bg-gray-300 items-center justify-center"
      >
        <Text className="text-[12px] text-gray-700 font-semibold">{initials}</Text>
      </View>
    );
  }

  return (
    <ActionSheet
      ref={sheetRef}
      onClose={handleClose}
      gestureEnabled
      closeOnTouchBackdrop
      closable
      drawUnderStatusBar
      statusBarTranslucent={Platform.OS === "android"}
      defaultOverlayOpacity={0.4}
      // SHOW the small horizontal drag line:
      indicatorStyle={{ width: 48, height: 6, borderRadius: 3, backgroundColor: "#D1D5DB" }}
      containerStyle={{
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        // allow absolutely positioned composer inside
        position: "relative",
      }}
      // 80% height sheet; adjust if you want taller/shorter
      snapPoints={[80]}
    >
      {/* Optional post preview */}
      {postPreview ? (
        <Text className="px-5 pt-2 pb-2 text-gray-500" numberOfLines={3}>
          {postPreview}
        </Text>
      ) : null}

      {/* SCROLLABLE LIST (Android & iOS) */}
      <FlatList
        ref={listRef}
        {...scrollHandlers}
        data={rows}
        keyExtractor={(i) => i.id}
        keyboardDismissMode={Platform.select({ ios: "interactive", android: "on-drag" })}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 6,
          // reserve space so list content doesn't hide behind the composer
          paddingBottom: listBottomPadding,
        }}
        renderItem={({ item }) => (
          <View className="flex-row mb-12">
            <Avatar name={item.username} uri={item.avatar_url ?? undefined} />
            <View className="flex-1">
              <Text className="text-[13px] font-semibold text-gray-900">{item.username ?? "User"}</Text>
              <Text className="text-[15px] text-gray-800 mt-1">{item.content}</Text>
              <Text className="text-[11px] text-gray-500 mt-1">
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
          </View>
        )}
        ListFooterComponent={<View style={{ height: 8 }} />}
        onContentSizeChange={() => {
          // auto-scroll to newest on first load
          requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
        }}
      />

      {/* FIXED COMPOSER at bottom (no footer prop) */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: bottomPad, // safe area
          paddingTop: 8,
          paddingHorizontal: 16,
          height: COMPOSER_H + bottomPad + 8, // reserve exact space
        }}
        className="bg-white border-t border-gray-200"
      >
        <View className="flex-row items-center">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write a comment…"
            multiline
            style={{ maxHeight: 120 }}
            className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-gray-900"
            returnKeyType="send"
            onSubmitEditing={send}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={send}
            className="ml-3 px-4 py-3 rounded-2xl bg-blue-600 active:opacity-90"
          >
            <Text className="text-white font-semibold">Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ActionSheet>
  );
}
