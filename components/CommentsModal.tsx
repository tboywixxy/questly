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
} from "react-native";
import ActionSheet, { useScrollHandlers } from "react-native-actions-sheet";
import type { ActionSheetRef } from "react-native-actions-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../src/services/supabase";
import { timeAgo } from "../src/utils/time"; 

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const sheetRef = useRef<ActionSheetRef>(null);
  const listRef = useRef<FlatList<CommentRow>>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const COLORS = {
    sheetBg: isDark ? "#1F2937" : "#FFFFFF",
    indicator: isDark ? "#374151" : "#D1D5DB",
    listText: isDark ? "#E5E7EB" : "#1F2937",
    listSubText: isDark ? "#9CA3AF" : "#6B7280",
    border: isDark ? "#374151" : "#E5E7EB",
    composerBg: isDark ? "#1F2937" : "#FFFFFF",
    inputBg: isDark ? "#374151" : "#F3F4F6",
    inputText: isDark ? "#F9FAFB" : "#111827",
    placeholder: isDark ? "#9CA3AF" : "#6B7280",
  };

  const COMPOSER_H = 56;
  const bottomPad = useMemo(() => Math.max(insets.bottom, 12), [insets.bottom]);
  const listBottomPadding = COMPOSER_H + bottomPad + 16;

  const scrollHandlers = useScrollHandlers("comments-sheet", listRef, () => {});

  async function load() {
    if (!postId) {
      setRows([]);
      return;
    }
    const { data, error } = await supabase
      .from("comments_feed")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRows(data as CommentRow[]);
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: false }));
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setUid(user?.id ?? null);
    })();
    return () => {
      active = false;
    };
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
              setRows((prev) => [data as CommentRow, ...prev]); 
              onCommentCountChange?.(1);
              requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
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
      setText(content);
    }
  }

  function handleClose() {
    Keyboard.dismiss();
    onClose();
  }

  function Avatar({ name, uri }: { name?: string | null; uri?: string | null }) {
    if (uri) {
      return (
        <Image
          source={{ uri }}
          style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12 }}
        />
      );
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
      indicatorStyle={{
        width: 48,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.indicator,
      }}
      containerStyle={{
        backgroundColor: COLORS.sheetBg,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        position: "relative",
      }}
      snapPoints={[80]}
    >
      {/* Optional post preview */}
      {postPreview ? (
        <Text
          className="px-5 pt-2 pb-2"
          style={{ color: COLORS.listSubText }}
          numberOfLines={3}
        >
          {postPreview}
        </Text>
      ) : null}

      {/* SCROLLABLE LIST (newest first) */}
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
          paddingBottom: listBottomPadding,
        }}
        renderItem={({ item }) => (
          <View className="flex-row mb-12">
            <Avatar name={item.username} uri={item.avatar_url ?? undefined} />
            <View className="flex-1">
              <Text
                className="text-[13px] font-semibold"
                style={{ color: COLORS.listText }}
              >
                {item.username ?? "User"}
              </Text>
              <Text
                className="text-[15px] mt-1"
                style={{ color: COLORS.listText }}
              >
                {item.content}
              </Text>
              <Text
                className="text-[11px] mt-1"
                style={{ color: COLORS.listSubText }}
              >
                {timeAgo(item.created_at)}
              </Text>
            </View>
          </View>
        )}
        ListFooterComponent={<View style={{ height: 8 }} />}
      />

      {/* FIXED COMPOSER */}
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
          backgroundColor: COLORS.composerBg,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        }}
      >
        <View className="flex-row items-center">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write a comment…"
            multiline
            style={{ maxHeight: 120, color: COLORS.inputText, backgroundColor: COLORS.inputBg }}
            className="flex-1 rounded-2xl px-4 py-3"
            placeholderTextColor={COLORS.placeholder}
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
