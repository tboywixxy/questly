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

export default function Register() {
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
    hint: isDark ? "#9CA3AF" : "#6B7280",          // gray-400 : gray-500
    inputText: isDark ? "#F9FAFB" : "#111827",     // gray-50 : gray-900
    brandBlue: "#2563EB",
    success: "#16A34A",
    buttonText: "#FFFFFF",
  };

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleRegister() {
    if (!email.trim() || !username.trim() || !password) {
      Alert.alert("Missing info", "Please fill all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    try {
      setSubmitting(true);
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        Alert.alert("Registration failed", error.message);
        return;
      }
      const userId = data.user?.id;
      if (userId) {
        const { error: profileErr } = await supabase
          .from("profiles")
          .insert([{ id: userId, username, email }]);
        if (profileErr) {
          // Not fatal for auth; let the user in but inform them.
          console.warn("Profile insert error:", profileErr.message);
        }
      }
      router.replace("/(tabs)/home");
    } catch (e: any) {
      Alert.alert("Registration failed", e?.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
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
        Create Account
      </Text>

      <Text style={{ marginBottom: 8, color: COLORS.textSecondary }}>Email</Text>
      <TextInput
        placeholder="you@example.com"
        placeholderTextColor={COLORS.hint}
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

      <Text style={{ marginBottom: 8, color: COLORS.textSecondary }}>Username</Text>
      <TextInput
        placeholder="username123"
        placeholderTextColor={COLORS.hint}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
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
        placeholderTextColor={COLORS.hint}
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
          marginBottom: 8,
          color: COLORS.inputText,
          fontSize: 16,
        }}
      />
      <Text style={{ fontSize: 12, color: COLORS.hint, marginBottom: 16 }}>
        Must include lowercase, uppercase, digits, and symbols.
      </Text>

      <Text style={{ marginBottom: 8, color: COLORS.textSecondary }}>Confirm Password</Text>
      <TextInput
        placeholder="Re-enter password"
        placeholderTextColor={COLORS.hint}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
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
        onPress={handleRegister}
        disabled={submitting}
        activeOpacity={0.9}
        style={{
          backgroundColor: submitting ? "#16A34A99" : COLORS.success,
          borderRadius: 12,
          paddingVertical: 12,
          marginBottom: 24,
        }}
      >
        <Text style={{ textAlign: "center", color: COLORS.buttonText, fontWeight: "600", fontSize: 18 }}>
          {submitting ? "Registering..." : "Register"}
        </Text>
      </TouchableOpacity>

      <Text style={{ textAlign: "center", color: COLORS.textSecondary }}>
        Already have an account?{" "}
        <Link
          href="/(auth)/login"
          style={{ color: COLORS.brandBlue, fontWeight: "600" }}
        >
          Login
        </Link>
      </Text>
    </View>
  );
}
