import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  useColorScheme,
} from "react-native";
import { supabase } from "../../src/services/supabase";
import { getBadge } from "../../src/utils/badges";

type Row = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  total_likes: number;
};

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---- Logos (same paths as Register) ----
const LOGO_LIGHT = require("../../assets/images/logo-em-bg-black.png"); // light mode
const LOGO_DARK  = require("../../assets/images/logo-rm-bg-light.png"); // dark mode

// ----- Theme helpers -----
function useTheme() {
  const isDark = useColorScheme() === "dark";
  const C = {
    pageBg: isDark ? "#0B1220" : "#F5F7FB",
    cardBg: isDark ? "#111827" : "#FFFFFF",
    cardAlt: isDark ? "#0F172A" : "#F9FAFB",
    hair: isDark ? "#1F2937" : "#E5E7EB",
    textPri: isDark ? "#F9FAFB" : "#0F172A",
    textSec: isDark ? "#CBD5E1" : "#475569",
    sub: isDark ? "#94A3B8" : "#64748B",
    accent: "#2563EB",
    goldBg: isDark ? "#3B2F00" : "#FFF7D6",
    goldBorder: isDark ? "#7C5F00" : "#FACC15",
    silverBg: isDark ? "#2E3238" : "#EEF2F7",
    silverBorder: isDark ? "#7C8895" : "#CBD5E1",
    bronzeBg: isDark ? "#3A2A22" : "#F8EDE6",
    bronzeBorder: isDark ? "#8B5E3C" : "#D6A67A",
    restBg: isDark ? "#0F172A" : "#FFFFFF",
  };
  return { isDark, C };
}

// ----- Skeleton while loading -----
function SkeletonRow({ delay = 0 }: { delay?: number }) {
  const { C } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, delay, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, delay]);

  return (
    <Animated.View
      style={{
        opacity: pulse,
        backgroundColor: C.cardBg,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: C.hair,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View style={{ width: 28, height: 16, borderRadius: 4, backgroundColor: C.hair, marginRight: 12 }} />
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.hair, marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <View style={{ height: 14, borderRadius: 7, backgroundColor: C.hair, width: "40%", marginBottom: 6 }} />
        <View style={{ height: 10, borderRadius: 5, backgroundColor: C.hair, width: "25%" }} />
      </View>
      <View style={{ width: 60, height: 20, borderRadius: 10, backgroundColor: C.hair }} />
    </Animated.View>
  );
}

// ----- Animated Row Card -----
function RowCard({
  item,
  index,
}: {
  item: Row;
  index: number;
}) {
  const { C } = useTheme();
  const badge = getBadge(item.total_likes);

  // Colors per rank
  const { bgColor, borderColor, rankEmoji } = useMemo(() => {
    if (index === 0) return { bgColor: C.goldBg, borderColor: C.goldBorder, rankEmoji: "👑" };
    if (index === 1) return { bgColor: C.silverBg, borderColor: C.silverBorder, rankEmoji: "🥈" };
    if (index === 2) return { bgColor: C.bronzeBg, borderColor: C.bronzeBorder, rankEmoji: "🥉" };
    return { bgColor: C.restBg, borderColor: C.hair, rankEmoji: "" };
  }, [index, C]);

  // Enter animation (staggered slide & fade)
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

  // Tiny press feedback
  const pressed = useRef(new Animated.Value(0)).current;
  const scale = pressed.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] });
  const shadow = pressed.interpolate({ inputRange: [0, 1], outputRange: [8, 2] });

  return (
    <Animated.View
      style={{
        transform: [
          { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
          { scale },
        ],
        opacity: enter,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: shadow as any,
        shadowOffset: { width: 0, height: 6 },
        elevation: 1,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={() =>
          Animated.timing(pressed, { toValue: 1, duration: 80, useNativeDriver: true }).start()
        }
        onPressOut={() =>
          Animated.timing(pressed, { toValue: 0, duration: 120, useNativeDriver: true }).start()
        }
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: bgColor,
          borderRadius: 16,
          padding: 14,
          borderWidth: 1,
          borderColor,
        }}
      >
        {/* Rank */}
        <View style={{ width: 36, alignItems: "center", marginRight: 4 }}>
          <Text
            style={{
              fontWeight: "800",
              color: index < 3 ? "#111827" : C.sub,
            }}
          >
            {index + 1}
          </Text>
          {!!rankEmoji && <Text style={{ fontSize: 12 }}>{rankEmoji}</Text>}
        </View>

        {/* Avatar */}
        {item.avatar_url ? (
          <Image
            source={{ uri: item.avatar_url }}
            style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }}
          />
        ) : (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              marginRight: 12,
              backgroundColor: "#CBD5E1",
            }}
          />
        )}

        {/* Name + likes */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPri, fontWeight: "700" }}>
            {item.username || "User"}
          </Text>
          <Text style={{ color: C.textSec, fontSize: 12 }}>
            {item.total_likes} likes
          </Text>
        </View>

        {/* Badge */}
        {badge && (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: "#11182720",
            }}
          >
            <Text style={{ color: "#111827", fontSize: 12, fontWeight: "800" }}>
              {badge.label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function LeaderboardTab() {
  const { isDark, C } = useTheme();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBoard = useCallback(async () => {
    const { data, error } = await supabase
      .from("user_like_totals") // all-time totals
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

const Header = () => (
  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
    <Text
      style={{ flex: 1, fontSize: 24, fontWeight: "800", color: C.textPri }}
      numberOfLines={1}
    >
      Leaderboard
    </Text>

    <Image
      source={isDark ? LOGO_DARK : LOGO_LIGHT}
      resizeMode="contain"
      accessibilityLabel="Questly logo"
      // Bigger logo on the far right
      style={{ width: 40, height: 40, marginLeft: 8 }}
    />
  </View>
);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.pageBg, paddingHorizontal: 16, paddingTop: 24 }}>
        <Header />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <SkeletonRow key={i} delay={i * 100} />
        ))}
      </View>
    );
  }

  const empty = !rows || rows.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg, paddingHorizontal: 16, paddingTop: 24 }}>
      <Header />

      {empty ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: C.textSec }}>No leaderboard scores</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.user_id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item, index }) => <RowCard item={item} index={index} />}
        />
      )}
    </View>
  );
}
