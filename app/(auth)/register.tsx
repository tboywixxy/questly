import { useState } from "react";
import {
  View,
  TextInput,
  Alert,
  Text,
  TouchableOpacity,
  useColorScheme,
  Platform,
  Image,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/services/supabase";
import { Link, useRouter } from "expo-router";

const LOGO_LIGHT = require("../../assets/images/logo-em-bg-black.png");
const LOGO_DARK  = require("../../assets/images/logo-rm-bg-light.png");  

export default function Register() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const COLORS = {
    pageBg: isDark ? "#111827" : "#F3F4F6",
    cardBg: isDark ? "#1F2937" : "#FFFFFF",
    border: isDark ? "#374151" : "#D1D5DB",
    textPrimary: isDark ? "#FFFFFF" : "#111827",
    textSecondary: isDark ? "#D1D5DB" : "#374151",
    hint: isDark ? "#9CA3AF" : "#6B7280",
    inputText: isDark ? "#F9FAFB" : "#111827",
    brandBlue: "#2563EB",
    success: "#16A34A",
    buttonText: "#FFFFFF",
    icon: isDark ? "#9CA3AF" : "#6B7280",
  };

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
        if (profileErr) console.warn("Profile insert error:", profileErr.message);
      }
    router.replace({ pathname: "/(auth)/otp", params: { email, username } });
    } catch (e: any) {
      Alert.alert("Registration failed", e?.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.pageBg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: "height" })}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 62,
            justifyContent: "center",
          }}
        >
          {/* Title in flow, top-left */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: COLORS.textPrimary,
              alignSelf: "flex-start",
              marginBottom: 12,
            }}
          >
            Create Account
          </Text>

          {/* Logo */}
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <Image
              source={isDark ? LOGO_DARK : LOGO_LIGHT}
              resizeMode="contain"
              accessibilityLabel="Questly logo"
              style={{ width: 120, height: 120 }}
            />
          </View>

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
          {/* Password with eye */}
          <View
            style={{
              position: "relative",
              borderWidth: 1,
              borderColor: COLORS.border,
              backgroundColor: COLORS.cardBg,
              borderRadius: 12,
              marginBottom: 8,
            }}
          >
            <TextInput
              placeholder="Enter password"
              placeholderTextColor={COLORS.hint}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={{
                paddingHorizontal: 16,
                paddingRight: 44,
                paddingVertical: Platform.select({ ios: 12, android: 10 }),
                color: COLORS.inputText,
                fontSize: 16,
              }}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((s) => !s)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              style={{
                position: "absolute",
                right: 12,
                top: 0,
                bottom: 0,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={COLORS.icon} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 12, color: COLORS.hint, marginBottom: 16 }}>
            Must include lowercase, uppercase, digits, and symbols.
          </Text>

          <Text style={{ marginBottom: 8, color: COLORS.textSecondary }}>Confirm Password</Text>
          {/* Confirm Password with eye */}
          <View
            style={{
              position: "relative",
              borderWidth: 1,
              borderColor: COLORS.border,
              backgroundColor: COLORS.cardBg,
              borderRadius: 12,
              marginBottom: 14,
            }}
          >
            <TextInput
              placeholder="Re-enter password"
              placeholderTextColor={COLORS.hint}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              style={{
                paddingHorizontal: 16,
                paddingRight: 44,
                paddingVertical: Platform.select({ ios: 12, android: 8 }),
                color: COLORS.inputText,
                fontSize: 16,
              }}
            />
            <TouchableOpacity
              onPress={() => setShowConfirm((s) => !s)}
              accessibilityRole="button"
              accessibilityLabel={showConfirm ? "Hide confirm password" : "Show confirm password"}
              style={{
                position: "absolute",
                right: 12,
                top: 0,
                bottom: 0,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name={showConfirm ? "eye-off" : "eye"} size={20} color={COLORS.icon} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={submitting}
            activeOpacity={0.9}
            style={{
              backgroundColor: submitting ? "#16A34A99" : COLORS.success,
              borderRadius: 12,
              paddingVertical: 8,
              marginBottom: 24,
            }}
          >
            <Text style={{ textAlign: "center", color: COLORS.buttonText, fontWeight: "600", fontSize: 18 }}>
              {submitting ? "Registering..." : "Register"}
            </Text>
          </TouchableOpacity>

          <Text style={{ textAlign: "center", color: COLORS.textSecondary }}>
            Already have an account?{" "}
            <Link href="/(auth)/login" style={{ color: COLORS.brandBlue, fontWeight: "600" }}>
              Login
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
