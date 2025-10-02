import { useState } from "react";
import {
  View,
  TextInput,
  Alert,
  Text,
  TouchableOpacity,
  useColorScheme,
  Platform,
} from "react-native";
import { supabase } from "../../src/services/supabase";
import { Link, useRouter } from "expo-router";

export default function Login() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Theme palette (Tailwind-ish grays)
  const COLORS = {
    pageBg: isDark ? "#111827" : "#F3F4F6",        // gray-900 : gray-100
    cardBg: isDark ? "#1F2937" : "#FFFFFF",        // gray-800 : white
    border: isDark ? "#374151" : "#D1D5DB",        // gray-700 : gray-300
    textPrimary: isDark ? "#FFFFFF" : "#111827",   // white : gray-900
    textSecondary: isDark ? "#D1D5DB" : "#374151", // gray-300 : gray-700
    inputText: isDark ? "#F9FAFB" : "#111827",     // gray-50 : gray-900
    placeholder: isDark ? "#9CA3AF" : "#6B7280",   // gray-400 : gray-500
    brand: "#2563EB",                              // blue-600
    buttonText: "#FFFFFF",
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert("Login failed", error.message);
      return;
    }
    router.replace("/(tabs)/home");
  }

  return (
    <View
      key={colorScheme} // 👈 instant re-mount when system theme flips
      style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24, backgroundColor: COLORS.pageBg }}
    >
      <Text
        style={{
          fontSize: 32,
          fontWeight: "800",
          textAlign: "center",
          marginBottom: 40,
          color: COLORS.textPrimary,
        }}
      >
        Questly
      </Text>

      <Text style={{ marginBottom: 8, color: COLORS.textSecondary }}>Email</Text>
      <TextInput
        placeholder="you@example.com"
        placeholderTextColor={COLORS.placeholder}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        style={{
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.cardBg,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: Platform.select({ ios: 12, android: 10 }),
          marginBottom: 16,
          color: COLORS.inputText,
          fontSize: 16,
        }}
      />

      <Text style={{ marginBottom: 8, color: COLORS.textSecondary }}>Password</Text>
      <TextInput
        placeholder="Enter password"
        placeholderTextColor={COLORS.placeholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        style={{
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.cardBg,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: Platform.select({ ios: 12, android: 10 }),
          marginBottom: 24,
          color: COLORS.inputText,
          fontSize: 16,
        }}
      />

      <TouchableOpacity
        onPress={handleLogin}
        activeOpacity={0.9}
        style={{
          backgroundColor: COLORS.brand,
          borderRadius: 12,
          paddingVertical: 12,
          marginBottom: 24,
        }}
      >
        <Text style={{ textAlign: "center", color: COLORS.buttonText, fontWeight: "600", fontSize: 18 }}>
          Login
        </Text>
      </TouchableOpacity>

      <Text style={{ textAlign: "center", color: COLORS.textSecondary }}>
        Don’t have an account?{" "}
        <Link
          href="/(auth)/register"
          style={{ color: COLORS.brand, fontWeight: "600" }}
        >
          Register
        </Link>
      </Text>
    </View>
  );
}
