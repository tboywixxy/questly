// app/(auth)/otp.jsx
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  useColorScheme,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../src/services/supabase";

// Theme-aware logos (same assets as your auth screens)
const LOGO_LIGHT = require("../../assets/images/logo-em-bg-black.png"); // for light mode
const LOGO_DARK  = require("../../assets/images/logo-rm-bg-light.png");  // for dark mode

export default function OtpScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";

  const COLORS = {
    pageBg: isDark ? "#0B1220" : "#F5F7FB",
    cardBg: isDark ? "#111827" : "#FFFFFF",
    textPri: isDark ? "#F9FAFB" : "#0F172A",
    textSec: isDark ? "#C2C8D6" : "#5B6474",
    border: isDark ? "#253047" : "#E5E7EB",
    hint:   isDark ? "#9CA3AF" : "#6B7280",
    inputBg:isDark ? "#1F2937" : "#FFFFFF",
    accent: "#2563EB",
    danger: "#EF4444",
    buttonText: "#FFFFFF",
  };

  // -------- Read params (plain JS to work in .jsx) --------
  const params = useLocalSearchParams();
  const emailParam = Array.isArray(params.email) ? params.email[0] : params.email;
  const usernameParam = Array.isArray(params.username) ? params.username[0] : params.username;

  const email = (emailParam ?? "").toString().trim();
  const username = (usernameParam ?? "").toString().trim();

  const [token, setToken] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(3600); // 60 minutes

  // Masked email (e.g., j****e@g***l.com)
  const maskedEmail = useMemo(() => {
    if (!email.includes("@")) return "your email";
    const [user, domainAll] = email.split("@");
    const parts = domainAll.split(".");
    const domain = parts[0] ?? "";
    const tld = parts.slice(1).join("."); // supports multi-part TLDs

    const mask = (s) => {
      if (!s) return "";
      if (s.length <= 2) return (s[0] ?? "") + "*";
      return s[0] + "*".repeat(Math.max(1, s.length - 2)) + s[s.length - 1];
    };

    return `${mask(user)}@${mask(domain)}${tld ? "." + tld : ""}`;
  }, [email]);

  // Countdown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const timeLeft = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [secondsLeft]);

  async function handleVerifyOtp() {
    if (!email) {
      Alert.alert("Missing email", "We couldn't detect your email from the previous step.");
      return;
    }
    if (token.length < 6) {
      Alert.alert("Invalid code", "Enter the 6-digit code we emailed you.");
      return;
    }
    if (secondsLeft <= 0) {
      Alert.alert("Code expired", "The code has expired. Please request a new one.");
      return;
    }

    // Verify the code sent to email
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      Alert.alert("Verification failed", error.message);
      return;
    }

    // Upsert username after verification (fixes the "username not saved" issue)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const updates = { id: user.id };
        if (username) updates.username = username;
        // keep email in profiles for convenience (optional)
        if (user.email) updates.email = user.email;

        await supabase.from("profiles").upsert(updates, { onConflict: "id" });
      }
    } catch (e) {
      // Non-fatal—user is still verified
      console.warn("Profile upsert after OTP failed:", e?.message);
    }

    Alert.alert("Success", "Your email has been verified!");
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
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 32,
          }}
        >
          {/* Logo at the top-left */}
          <View style={{ alignItems: "flex-start", marginBottom: 16 }}>
            <Image
              source={isDark ? LOGO_DARK : LOGO_LIGHT}
              resizeMode="contain"
              accessibilityLabel="Questly logo"
              style={{ width: 56, height: 56, borderRadius: 12 }}
            />
          </View>

          {/* Card */}
          <View
            style={{
              backgroundColor: COLORS.cardBg,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: COLORS.border,
              padding: 18,
            }}
          >
            {/* Title + description */}
            <Text style={{ fontSize: 22, fontWeight: "800", color: COLORS.textPri, marginBottom: 6 }}>
              Verify your email
            </Text>
            <Text style={{ color: COLORS.textSec, marginBottom: 12 }}>
              We sent a 6-digit code to{" "}
              <Text style={{ fontWeight: "700", color: COLORS.textPri }}>{maskedEmail}</Text>.
            </Text>

            {/* Countdown */}
            <View
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}
            >
              <Text style={{ color: COLORS.textSec }}>Code expires in</Text>
              <Text
                style={{
                  color: secondsLeft > 60 ? COLORS.textPri : COLORS.danger,
                  fontWeight: "800",
                  fontSize: 18,
                }}
              >
                {timeLeft}
              </Text>
            </View>

            {/* OTP input */}
            <Text style={{ color: COLORS.textSec, marginBottom: 8 }}>Enter code</Text>
            <TextInput
              placeholder="••••••"
              placeholderTextColor={COLORS.hint}
              value={token}
              onChangeText={(t) => setToken(t.replace(/[^0-9]/g, "").slice(0, 6))}
              keyboardType={Platform.select({ ios: "number-pad", android: "numeric" })}
              maxLength={6}
              autoFocus
              style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.inputBg,
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 16,
                textAlign: "center",
                letterSpacing: 8, // spaced look
                fontSize: 22,
                fontWeight: "700",
                color: COLORS.textPri,
                marginBottom: 18,
              }}
            />

            {/* Verify button */}
            <TouchableOpacity
              onPress={handleVerifyOtp}
              disabled={token.length < 6 || secondsLeft <= 0}
              activeOpacity={0.9}
              style={{
                backgroundColor:
                  token.length < 6 || secondsLeft <= 0 ? "#2563EB88" : COLORS.accent,
                borderRadius: 12,
                paddingVertical: 12,
              }}
            >
              <Text style={{ textAlign: "center", color: COLORS.buttonText, fontWeight: "700", fontSize: 16 }}>
                Verify & Continue
              </Text>
            </TouchableOpacity>

            <Text style={{ color: COLORS.hint, fontSize: 12, marginTop: 10 }}>
              Didn’t get a code? Check your spam folder. If it’s expired, go back and resend.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
