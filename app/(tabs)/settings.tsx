// app/(tabs)/settings.tsx
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Platform,
  Switch,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  Image, // ← added
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/services/supabase";

// Theme-aware logos (same as Register)
const LOGO_LIGHT = require("../../assets/images/logo-em-bg-black.png");
const LOGO_DARK  = require("../../assets/images/logo-rm-bg-light.png");

/* ----------------------------- THEME HOOK ----------------------------- */
function useTheme() {
  const isDark = useColorScheme() === "dark";
  return useMemo(
    () => ({
      isDark,
      C: {
        pageBg: isDark ? "#0B1220" : "#F5F7FB",
        cardBg: isDark ? "#111827" : "#FFFFFF",
        border: isDark ? "#1F2937" : "#E5E7EB",
        hair: isDark ? "#1F2937" : "#EAECEF",
        textPri: isDark ? "#F9FAFB" : "#0F172A",
        textSec: isDark ? "#AAB2C8" : "#64748B",
        pill: isDark ? "#1F2937" : "#EFF4FB",
        brand: "#2563EB",
        danger: "#DC2626",
        good: "#16A34A",
      },
    }),
    [isDark]
  );
}

/* -------------------------- REUSABLE ROW ITEM ------------------------- */
function PressableRow({
  onPress,
  icon,
  tint,
  label,
  right,
  C,
}: {
  onPress?: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  label: string;
  right?: React.ReactNode;
  C: { textPri: string; textSec: string };
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handleIn = () =>
    Animated.timing(scale, {
      toValue: 0.98,
      duration: 80,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

  const handleOut = () =>
    Animated.timing(scale, {
      toValue: 1,
      duration: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 12 }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handleIn}
        onPressOut={handleOut}
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 14,
        }}
      >
        {/* Left: icon + label */}
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: tint + "22", // soft tint bg
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name={icon} size={18} color={tint} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: "600", color: C.textPri }}>{label}</Text>
        </View>

        {/* Right: custom node or themed chevron */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {right ? right : <Ionicons name="chevron-forward" size={18} color={C.textSec} />}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ------------------------------ MAIN VIEW ----------------------------- */
export default function SettingsScreen() {
  const router = useRouter();
  const { isDark, C } = useTheme();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Switch colors
  const trackOn = isDark ? "#4ADE80" : "#86EFAC";
  const trackOff = isDark ? "#4B5563" : "#D1D5DB";
  const thumbOn = Platform.select({ android: "#22C55E", ios: "#FFFFFF" })!;
  const thumbOff = Platform.select({ android: "#F4F3F4", ios: "#FFFFFF" })!;

  async function doLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Logout failed", error.message);
      return;
    }
    router.replace("/(auth)/login");
  }

  function confirmLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: doLogout },
    ]);
  }

  return (
    <View
      key={isDark ? "dark" : "light"} // instant remount on theme flip
      style={{
        flex: 1,
        backgroundColor: C.pageBg,
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 20,
      }}
    >
      {/* Header with right-aligned logo */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <View>
          <Text style={{ fontSize: 24, fontWeight: "800", color: C.textPri }}>Settings</Text>
          <Text style={{ fontSize: 12, color: C.textSec, marginTop: 4 }}>
            Tune your Questly experience
          </Text>
        </View>

        <Image
          source={isDark ? LOGO_DARK : LOGO_LIGHT}
          resizeMode="contain"
          accessibilityLabel="Questly logo"
          style={{ width: 40, height: 40, marginLeft: 12 }} // same size as requested
        />
      </View>

      {/* Card of rows */}
      <View
        style={{
          backgroundColor: C.cardBg,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: C.border,
          paddingHorizontal: 14,
          paddingTop: 6,
          paddingBottom: 6,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 1,
        }}
      >
        {/* Profile */}
        <PressableRow
          onPress={() => router.push("/profile")}
          icon="person-outline"
          tint={C.brand}
          label="Profile"
          right={<Ionicons name="chevron-forward" size={18} color={C.textSec} />}
          C={C}
        />

        <View style={{ height: 1, backgroundColor: C.hair }} />

        {/* Notifications */}
        <PressableRow
          icon="notifications-outline"
          tint={C.good}
          label="Notifications"
          right={
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              ios_backgroundColor={trackOff}
              trackColor={{ false: trackOff, true: trackOn }}
              thumbColor={notificationsEnabled ? thumbOn : thumbOff}
            />
          }
          C={C}
        />

        <View style={{ height: 1, backgroundColor: C.hair }} />

        {/* Passwords */}
        <PressableRow
          onPress={() => router.push("/password")}
          icon="key-outline"
          tint={C.textSec}
          label="Passwords"
          right={<Ionicons name="chevron-forward" size={18} color={C.textSec} />}
          C={C}
        />

        <View style={{ height: 1, backgroundColor: C.hair }} />

        {/* Support */}
        <PressableRow
          onPress={() => router.push("/support")}
          icon="help-buoy-outline"
          tint={C.brand}
          label="Support"
          right={<Ionicons name="chevron-forward" size={18} color={C.textSec} />}
          C={C}
        />

        <View style={{ height: 1, backgroundColor: C.hair }} />

        {/* Logout */}
        <PressableRow
          onPress={confirmLogout}
          icon="log-out-outline"
          tint={C.danger}
          label="Logout"
          right={<Ionicons name="chevron-forward" size={18} color={C.textSec} />}
          C={C}
        />
      </View>

      {/* Footer */}
      <View style={{ alignItems: "center", marginTop: 14 }}>
        <Text style={{ color: C.textSec, fontSize: 12 }}>Questly v0.1 • Made with Passion❤️</Text>
      </View>
    </View>
  );
}
