// app/notifications.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  useColorScheme,
  Image, // ← added
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../src/services/supabase";

/* ============================== Types ============================== */
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

/* ============================== Logos ============================== */
// Theme-aware logos (same as Register)
const LOGO_LIGHT = require("../assets/images/logo-em-bg-black.png");
const LOGO_DARK  = require("../assets/images/logo-rm-bg-light.png");

/* ============================== Theme ============================== */
function useTheme() {
  const isDark = useColorScheme() === "dark";
  return useMemo(
    () => ({
      isDark,
      C: {
        pageBg: isDark ? "#0B1220" : "#F5F7FB",
        cardBg: isDark ? "#111827" : "#FFFFFF",
        cardAlt: isDark ? "#0F172A" : "#F9FAFB",
        border: isDark ? "#1F2937" : "#E5E7EB",
        hair: isDark ? "#1F2937" : "#EAECEF",
        textPri: isDark ? "#F9FAFB" : "#0F172A",
        textSec: isDark ? "#AAB2C8" : "#64748B",
        likeTint: "#16A34A",
        commentTint: "#2563EB",
        danger: "#EF4444",
        // backgrounds
        unreadBg: isDark ? "#162033" : "#EEF4FF",
        readBg: isDark ? "#101826" : "#F8FAFC",
      },
    }),
    [isDark]
  );
}

/* ============================ Utilities ============================ */
function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(1, Math.floor((now - then) / 1000));
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

/* ========================= Skeleton pieces ========================= */
function Shimmer({ width, height, radius = 10 }: { width: number | string; height: number; radius?: number }) {
  const { C } = useTheme();
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v]);

  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [-100, 300] });

  return (
    <View style={{ width, height, borderRadius: radius, backgroundColor: C.hair, overflow: "hidden" }}>
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 100,
          transform: [{ translateX }],
          opacity: 0.25,
          backgroundColor: "#FFFFFF",
        }}
      />
    </View>
  );
}

function SkeletonRow({ delay = 0 }: { delay?: number }) {
  const { C } = useTheme();
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 320,
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
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.border,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Shimmer width={36} height={36} radius={10} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Shimmer width="70%" height={12} />
          <View style={{ height: 8 }} />
          <Shimmer width="40%" height={10} radius={6} />
        </View>
      </View>
    </Animated.View>
  );
}

/* ========================== Row Component ========================== */
function NotificationRow({ item, index }: { item: Notification; index: number }) {
  const { C } = useTheme();

  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 380,
      delay: index * 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  const tint = item.type === "like" ? C.likeTint : C.commentTint;
  const iconName = item.type === "like" ? "heart-outline" : "chatbubble-ellipses-outline";
  const bgColor = item.read ? C.readBg : C.unreadBg;

  const press = useRef(new Animated.Value(0)).current;
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] });

  return (
    <Animated.View
      style={{
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale }],
        opacity: enter,
        marginBottom: 12,
      }}
    >
      <Pressable
        onPressIn={() =>
          Animated.timing(press, { toValue: 1, duration: 80, useNativeDriver: true }).start()
        }
        onPressOut={() =>
          Animated.timing(press, { toValue: 0, duration: 120, useNativeDriver: true }).start()
        }
        style={{
          backgroundColor: C.cardBg,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: C.border,
          padding: 14,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: tint + "22",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name={iconName as any} size={18} color={tint} />
          </View>

          <View style={{ flex: 1 }}>
            <View
              style={{
                backgroundColor: bgColor,
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: C.textPri }}>{item.message}</Text>
            </View>

            <Text style={{ color: C.textSec, fontSize: 11, marginTop: 6 }}>
              {timeAgo(item.created_at)} ago
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/* ============================== Page =============================== */
export default function NotificationsPage() {
  const { isDark, C } = useTheme();

  const [rows, setRows] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) setRows(data as Notification[]);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();

    // realtime: only inserts for my user
    const channel = supabase
      .channel("rt-notifications-page")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        async (payload) => {
          const n = payload.new as Notification;
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user?.id === n.user_id) {
            setRows((prev) => [n, ...prev]);
          }
        }
      )
      .subscribe();

    // mark all as read on open (fire & forget)
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
    <View style={{ flex: 1, backgroundColor: C.pageBg, paddingHorizontal: 24, paddingTop: 24 }}>
      {/* Header with right-aligned logo */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <View>
          <Text style={{ fontSize: 24, fontWeight: "800", color: C.textPri }}>Notifications</Text>
          <Text style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>
            You’re all caught up on Questly
          </Text>
        </View>

        <Image
          source={isDark ? LOGO_DARK : LOGO_LIGHT}
          resizeMode="contain"
          accessibilityLabel="Questly logo"
          style={{ width: 40, height: 40, marginLeft: 12 }} // same size as Settings
        />
      </View>

      {/* Loading with skeletons */}
      {loading ? (
        <View style={{ flex: 1 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonRow key={i} delay={i * 90} />
          ))}
        </View>
      ) : empty ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: C.textSec }}>No notifications</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(n) => n.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item, index }) => <NotificationRow item={item} index={index} />}
        />
      )}
    </View>
  );
}
