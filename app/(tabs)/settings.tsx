import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Switch,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  Platform,
} from "react-native";
import { supabase } from "../../src/services/supabase";

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Theme palette (Tailwind-ish grays)
  const COLORS = {
    pageBg: isDark ? "#111827" : "#F3F4F6",        // gray-900 : gray-100
    cardBg: isDark ? "#1F2937" : "#FFFFFF",        // gray-800 : white
    textPrimary: isDark ? "#FFFFFF" : "#111827",   // white : gray-900
    // Switch colors
    trackOn: isDark ? "#4ADE80" : "#86EFAC",       // emerald-400/300
    trackOff: isDark ? "#4B5563" : "#D1D5DB",      // gray-600 / gray-300
    thumbOn: Platform.select({ android: "#22C55E", ios: "#FFFFFF" })!, // android green / iOS default white
    thumbOff: Platform.select({ android: "#F4F3F4", ios: "#FFFFFF" })!,
  };

  function confirmLogout() {
    Alert.alert(
      "Log out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert("Logout failed", error.message);
              return;
            }
            router.replace("/(auth)/login"); // prevent back navigation
          },
        },
      ],
      { cancelable: true }
    );
  }

  return (
    <View
      key={colorScheme} // 👈 instant remount when system theme flips
      style={{ flex: 1, backgroundColor: COLORS.pageBg, paddingHorizontal: 24, paddingVertical: 32 }}
    >
      <Text style={{ fontSize: 24, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 24 }}>
        Settings
      </Text>

      {/* Profile */}
      <TouchableOpacity
        onPress={() => router.push("/profile")}
        activeOpacity={0.8}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: COLORS.cardBg,
          padding: 16,
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 18, color: COLORS.textPrimary }}>Profile</Text>
      </TouchableOpacity>

      {/* Notifications */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: COLORS.cardBg,
          padding: 16,
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 18, color: COLORS.textPrimary }}>Notifications</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          // iOS: use trackColor + ios_backgroundColor, thumb stays white
          ios_backgroundColor={COLORS.trackOff}
          // Android: use trackColor + thumbColor
          trackColor={{ false: COLORS.trackOff, true: COLORS.trackOn }}
          thumbColor={notificationsEnabled ? COLORS.thumbOn : COLORS.thumbOff}
        />
      </View>

      {/* Passwords */}
      <TouchableOpacity
        onPress={() => router.push("/password")}
        activeOpacity={0.8}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: COLORS.cardBg,
          padding: 16,
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 18, color: COLORS.textPrimary }}>Passwords</Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity
        onPress={confirmLogout}
        activeOpacity={0.8}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: COLORS.cardBg,
          padding: 16,
          borderRadius: 12,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "600", color: "#DC2626" /* red-600 */ }}>
          Logout
        </Text>
      </TouchableOpacity>
    </View>
  );
}
