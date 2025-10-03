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

export default function Login() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const COLORS = {
    pageBg: isDark ? "#111827" : "#F3F4F6",
    cardBg: isDark ? "#1F2937" : "#FFFFFF",
    border: isDark ? "#374151" : "#D1D5DB",
    textPrimary: isDark ? "#FFFFFF" : "#111827",
    textSecondary: isDark ? "#D1D5DB" : "#374151",
    inputText: isDark ? "#F9FAFB" : "#111827",
    placeholder: isDark ? "#9CA3AF" : "#6B7280",
    brand: "#2563EB",
    buttonText: "#FFFFFF",
    icon: isDark ? "#E5E7EB" : "#6B7280",
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert("Login failed", error.message);
      return;
    }
    router.replace("/(tabs)/home");
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
            paddingBottom: 32,
            justifyContent: "center",
          }}
        >
          {/* Title */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: COLORS.textPrimary,
              alignSelf: "flex-start",
              marginBottom: 12,
            }}
          >
            Login to your account
          </Text>

          {/* Logo */}
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <Image
              source={isDark ? LOGO_DARK : LOGO_LIGHT}
              resizeMode="contain"
              accessibilityLabel="Questly logo"
              style={{ width: 140, height: 140 }}
            />
          </View>

          {/* Email */}
          <Text style={{ marginBottom: 8, color: COLORS.textSecondary }}>Email</Text>
          <TextInput
            placeholder="you@example.com"
            placeholderTextColor={COLORS.placeholder}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            autoComplete="email"
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

          {/* Password + Eye */}
          <Text style={{ marginBottom: 8, color: COLORS.textSecondary }}>Password</Text>
          <View style={{ position: "relative", marginBottom: 24 }}>
            <TextInput
              placeholder="Enter password"
              placeholderTextColor={COLORS.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              textContentType="password"
              autoComplete="password"
              returnKeyType="done"
              style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.cardBg,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingRight: 48,
                paddingVertical: Platform.select({ ios: 12, android: 10 }),
                color: COLORS.inputText,
                fontSize: 16,
              }}
            />

            <TouchableOpacity
              onPress={() => setShowPassword((s) => !s)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: [{ translateY: -12 }],
                height: 24,
                width: 32,
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={22}
                color={COLORS.icon}
              />
            </TouchableOpacity>
          </View>

          {/* Submit */}
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
            <Text
              style={{
                textAlign: "center",
                color: COLORS.buttonText,
                fontWeight: "600",
                fontSize: 18,
              }}
            >
              Login
            </Text>
          </TouchableOpacity>

          {/* Link */}
          <Text style={{ textAlign: "center", color: COLORS.textSecondary }}>
            Don’t have an account?{" "}
            <Link href="/(auth)/register" style={{ color: COLORS.brand, fontWeight: "600" }}>
              Register
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
