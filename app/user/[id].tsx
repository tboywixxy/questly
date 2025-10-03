// app/user/[id].tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/services/supabase";

const LOGO_LIGHT = require("../../assets/images/logo-em-bg-black.png");
const LOGO_DARK = require("../../assets/images/logo-rm-bg-light.png");

type ProfileRow = {
  username: string | null;
  email: string | null;
  avatar_url?: string | null;
};

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();

  const C = {
    pageBg: isDark ? "#0B1220" : "#F5F7FB",
    cardBg: isDark ? "#111827" : "#FFFFFF",
    cardAlt: isDark ? "#0F172A" : "#F9FAFB",
    border: isDark ? "#1F2937" : "#E5E7EB",
    hair: isDark ? "#1F2937" : "#EAECEF",
    textPri: isDark ? "#F9FAFB" : "#0F172A",
    textSec: isDark ? "#C7D2FE" : "#475569",
    brand: "#2563EB",
    brandSoft: "#2563EB15",
    glow: isDark ? "#3B82F6" : "#60A5FA",
  };

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ProfileRow | null>(null);
  const [hasAvatarColumn, setHasAvatarColumn] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // tiny pulse for avatar on load
  const avatarPulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(avatarPulse, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(avatarPulse, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  const avatarScale = avatarPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });

  // load profile
  useEffect(() => {
    (async () => {
      try {
        if (!id) throw new Error("Missing user id");
        const { data, error } = await supabase
          .from("profiles")
          .select("username,email,avatar_url")
          .eq("id", id)
          .maybeSingle();

        if (error) {
          setHasAvatarColumn(false);
          const { data: data2, error: err2 } = await supabase
            .from("profiles")
            .select("username,email")
            .eq("id", id)
            .maybeSingle();
          if (err2) throw err2;
          setRow(data2 ?? { username: null, email: null });
        } else {
          setHasAvatarColumn(true);
          setRow(data ?? { username: null, email: null, avatar_url: null });
        }
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const maskedEmail = useMemo(() => {
    const e = row?.email ?? "";
    if (!e) return "";
    const [local, domain] = e.split("@");
    if (!domain) return e;
    const shown = local.length <= 2 ? local[0] ?? "" : `${local.slice(0, 2)}***`;
    return `${shown}@${domain}`;
  }, [row?.email]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.pageBg }}>
        <View
          style={{
            flex: 1,
            backgroundColor: C.pageBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color={C.textPri} />
        </View>
      </SafeAreaView>
    );
  }

  if (!row) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.pageBg }}>
        <View
          style={{
            flex: 1,
            backgroundColor: C.pageBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: C.textPri }}>User not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.pageBg }} edges={["left", "right"]}>
      {/* Hero / header card */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: 16,
          backgroundColor: isDark ? "#0D152A" : "#EAF2FF",
          borderBottomWidth: 1,
          borderBottomColor: C.hair,
        }}
      >
        {/* Brand logo top-left */}
        <Image
          source={isDark ? LOGO_DARK : LOGO_LIGHT}
          resizeMode="contain"
          accessibilityLabel="Questly logo"
          style={{ width: 60, height: 60, alignSelf: "flex-start" }}
        />

        <View
          style={{
            backgroundColor: C.cardBg,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: C.border,
            paddingVertical: 18,
            paddingHorizontal: 18,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {/* Avatar (tap to open full view) */}
          <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => hasAvatarColumn && row?.avatar_url && setLightboxOpen(true)}
            >
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  borderWidth: 2,
                  borderColor: C.glow,
                  overflow: "hidden",
                  backgroundColor: C.cardAlt,
                  marginRight: 14,
                }}
              >
                {hasAvatarColumn && row?.avatar_url ? (
                  <Image source={{ uri: row.avatar_url }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="person-circle-outline" size={56} color={C.textSec} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Display fields (read-only) */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.textPri, fontSize: 20, fontWeight: "800" }}>
              {row.username || "User"}
            </Text>
            {!!maskedEmail && <Text style={{ color: C.textSec, marginTop: 4 }}>{maskedEmail}</Text>}
            <Text style={{ color: C.textSec, marginTop: 8, fontSize: 12 }}>Read-only profile</Text>
          </View>
        </View>
      </View>

      {/* Body (reserved for future: user’s posts, badges, etc.) */}
      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding" })} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: Math.max(insets.bottom, 24),
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: C.cardBg,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.border,
              padding: 16,
            }}
          >
            <Text style={{ color: C.textPri, fontWeight: "800", marginBottom: 6 }}>About</Text>
            <Text style={{ color: C.textSec }}>
              {row.username || "This user"} hasn’t added additional info yet.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fullscreen avatar lightbox */}
      <Modal
        visible={lightboxOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.9)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {row?.avatar_url ? (
            <Image
              source={{ uri: row.avatar_url }}
              style={{ width: "92%", height: "75%" }}
              resizeMode="contain"
            />
          ) : null}

          {/* Close / remove-from-view button */}
          <TouchableOpacity
            onPress={() => setLightboxOpen(false)}
            activeOpacity={0.9}
            style={{
              position: "absolute",
              top: 40,
              right: 20,
              backgroundColor: "rgba(255,255,255,0.15)",
              borderRadius: 24,
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.3)",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
