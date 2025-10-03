import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../src/services/supabase";

const LOGO_LIGHT = require("../assets/images/logo-em-bg-black.png");
const LOGO_DARK  = require("../assets/images/logo-rm-bg-light.png");

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const C = {
    pageBg: isDark ? "#0B1220" : "#F5F7FB",
    cardBg: isDark ? "#111827" : "#FFFFFF",
    cardAlt: isDark ? "#0F172A" : "#F9FAFB",
    border: isDark ? "#1F2937" : "#E5E7EB",
    hair: isDark ? "#1F2937" : "#EAECEF",
    textPri: isDark ? "#F9FAFB" : "#0F172A",
    textSec: isDark ? "#C7D2FE" : "#475569",
    placeholder: isDark ? "#9CA3AF" : "#6B7280",
    inputText: isDark ? "#F9FAFB" : "#0F172A",
    brand: "#2563EB",
    brandSoft: "#2563EB15",
    success: "#16A34A",
    danger: "#DC2626",
    glow: isDark ? "#3B82F6" : "#60A5FA",
  };

  const [loading, setLoading] = useState(true);

  // form fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [origUsername, setOrigUsername] = useState("");
  const [origEmail, setOrigEmail] = useState("");
  const [origAvatar, setOrigAvatar] = useState<string | null>(null);

  const [editingUsername, setEditingUsername] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);

  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const [hasAvatarColumn, setHasAvatarColumn] = useState(true);

  const avatarPulse = useRef(new Animated.Value(0)).current;
  const emailShake = useRef(new Animated.Value(0)).current;
  const editableBgAnimUser = useRef(new Animated.Value(0)).current;
  const editableBgAnimMail = useRef(new Animated.Value(0)).current;

  function runAvatarPulseOnce() {
    Animated.sequence([
      Animated.timing(avatarPulse, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(avatarPulse, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }

  function runEmailShake() {
    emailShake.setValue(0);
    Animated.sequence([
      Animated.timing(emailShake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(emailShake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(emailShake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(emailShake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  function animateEditableBg(target: Animated.Value, on: boolean) {
    Animated.timing(target, {
      toValue: on ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }

  const dirty = useMemo(
    () => username !== origUsername || email !== origEmail || avatarUrl !== origAvatar,
    [username, email, avatarUrl, origUsername, origEmail, origAvatar]
  );
  const emailValid = useMemo(
    () => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    [email]
  );

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();
        if (userErr || !user) {
          router.replace("/(auth)/login");
          return;
        }
        const authEmail = user.email ?? "";

        const { data, error } = await supabase
          .from("profiles")
          .select("username, email, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          if (String(error.message).toLowerCase().includes("avatar_url")) {
            setHasAvatarColumn(false);
            const { data: data2 } = await supabase
              .from("profiles")
              .select("username, email")
              .eq("id", user.id)
              .maybeSingle();

            const u = data2?.username ?? "";
            const e = data2?.email ?? authEmail;

            setUsername(u);
            setEmail(e);
            setAvatarUrl(null);

            setOrigUsername(u);
            setOrigEmail(e);
            setOrigAvatar(null);
          } else {
            throw error;
          }
        } else {
          const u = data?.username ?? "";
          const e = data?.email ?? authEmail;
          const a = data?.avatar_url ?? null;

          setUsername(u);
          setEmail(e);
          setAvatarUrl(a);

          setOrigUsername(u);
          setOrigEmail(e);
          setOrigAvatar(a);
          setHasAvatarColumn(true);
        }
      } catch (e: any) {
        console.log("Load profile error:", e?.message);
        Alert.alert("Error", e?.message ?? "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function pickImage() {
    if (!hasAvatarColumn) {
      Alert.alert("Avatar disabled", "Add an 'avatar_url' column to enable profile photos.");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo access to upload an avatar.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.86,
    });
    if (!result.canceled && result.assets?.length) {
      setAvatarUrl(result.assets[0].uri);
      runAvatarPulseOnce();
    }
  }

  async function uploadAvatarIfNeeded(userId: string) {
    if (!hasAvatarColumn) return origAvatar ?? null;
    if (!avatarUrl) return origAvatar ?? null;
    if (avatarUrl.startsWith("http")) return avatarUrl;

    const res = await fetch(avatarUrl);
    const buffer: ArrayBuffer = await res.arrayBuffer();

    const path = `${userId}/${Date.now()}.jpg`;
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, buffer, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (uploadErr) throw uploadErr;

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSave() {
    try {
      if (!emailValid) {
        runEmailShake();
        return;
      }
      setLoading(true);
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) throw userErr ?? new Error("Not authenticated");

      let finalAvatarUrl = origAvatar;
      if (hasAvatarColumn && avatarUrl !== origAvatar) {
        finalAvatarUrl = await uploadAvatarIfNeeded(user.id);
      }

      const updates: Record<string, any> = { id: user.id, username, email };
      if (hasAvatarColumn) updates.avatar_url = finalAvatarUrl ?? null;

      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert(updates)
        .eq("id", user.id);
      if (profileErr) throw profileErr;

      if (email && email !== origEmail) {
        const { error: emailErr } = await supabase.auth.updateUser({ email });
        if (emailErr) throw emailErr;
      }

      setOrigUsername(username);
      setOrigEmail(email);
      setOrigAvatar(finalAvatarUrl ?? null);
      setEditingUsername(false);
      setEditingEmail(false);

      Alert.alert("Success", "Profile updated!");
    } catch (e: any) {
      Alert.alert("Update failed", e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function toggleEditUsername() {
    setEditingUsername((prev) => {
      const next = !prev;
      animateEditableBg(editableBgAnimUser, next);
      if (next) setTimeout(() => usernameRef.current?.focus(), 50);
      return next;
    });
  }
  function toggleEditEmail() {
    setEditingEmail((prev) => {
      const next = !prev;
      animateEditableBg(editableBgAnimMail, next);
      if (next) setTimeout(() => emailRef.current?.focus(), 50);
      return next;
    });
  }

  const avatarScale = avatarPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });
  const emailShakeStyle = {
    transform: [
      {
        translateX: emailShake.interpolate({
          inputRange: [-1, 1],
          outputRange: [-6, 6],
        }),
      },
    ],
  };
  const editableBgUser = editableBgAnimUser.interpolate({
    inputRange: [0, 1],
    outputRange: ["transparent", C.brandSoft],
  });
  const editableBgMail = editableBgAnimMail.interpolate({
    inputRange: [0, 1],
    outputRange: ["transparent", C.brandSoft],
  });

  if (loading) {
    return (
      <View
        key={colorScheme}
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.pageBg }}
      >
        <ActivityIndicator size="large" color={C.textPri} />
      </View>
    );
  }

  return (
    <View key={colorScheme} style={{ flex: 1, backgroundColor: C.pageBg }}>
      {/* Header / Avatar card (fixed at top of ScrollView content) */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: 16,
          backgroundColor: isDark ? "#0D152A" : "#EAF2FF",
          borderBottomWidth: 1,
          borderBottomColor: C.hair,
        }}
      >
        {/* NEW: Top-left logo */}
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
          {/* Avatar */}
          <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
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
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: "100%", height: "100%" }} />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="person-circle-outline" size={56} color={C.textSec} />
                </View>
              )}

              {/* camera overlay button */}
              {hasAvatarColumn && (
                <TouchableOpacity
                  onPress={pickImage}
                  activeOpacity={0.9}
                  style={{
                    position: "absolute",
                    right: 6,
                    bottom: 6,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: C.cardBg,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: C.border,
                  }}
                >
                  <Ionicons name="camera" size={16} color={C.textPri} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {/* Title + hint */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.textPri, fontSize: 20, fontWeight: "800" }}>Your Profile</Text>
            <Text style={{ color: C.textSec, marginTop: 4 }}>
              Keep your info up to date. Tap the camera to change your photo.
            </Text>
          </View>
        </View>
      </View>

      {/* Body: make it scrollable under the keyboard */}
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: Math.max(insets.bottom, 24),
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.select({ ios: "interactive", android: "on-drag" })}
          showsVerticalScrollIndicator={false}
        >
          {/* Username Card */}
          <View
            style={{
              backgroundColor: C.cardBg,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.border,
              padding: 14,
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  backgroundColor: C.brandSoft,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="person-outline" size={16} color={C.brand} />
              </View>
              <Text style={{ color: C.textPri, fontWeight: "700", fontSize: 16, flex: 1 }}>Username</Text>
              <TouchableOpacity onPress={toggleEditUsername} hitSlop={8}>
                <Text style={{ color: C.brand, fontWeight: "700" }}>{editingUsername ? "Done" : "Edit"}</Text>
              </TouchableOpacity>
            </View>

            <Animated.View style={{ backgroundColor: editableBgUser, borderRadius: 10 }}>
              <TextInput
                ref={usernameRef}
                value={username}
                onChangeText={setUsername}
                editable={editingUsername}
                placeholder="Enter your username"
                placeholderTextColor={C.placeholder}
                style={{
                  color: C.inputText,
                  paddingVertical: Platform.select({ ios: 12, android: 10 }),
                  paddingHorizontal: 12,
                  fontSize: 16,
                }}
                underlineColorAndroid="transparent"
                returnKeyType="done"
              />
            </Animated.View>
          </View>

          {/* Email Card */}
          <View
            style={{
              backgroundColor: C.cardBg,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.border,
              padding: 14,
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  backgroundColor: C.brandSoft,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="mail-outline" size={16} color={C.brand} />
              </View>
              <Text style={{ color: C.textPri, fontWeight: "700", fontSize: 16, flex: 1 }}>Email</Text>
              <TouchableOpacity onPress={toggleEditEmail} hitSlop={8}>
                <Text style={{ color: C.brand, fontWeight: "700" }}>{editingEmail ? "Done" : "Edit"}</Text>
              </TouchableOpacity>
            </View>

            <Animated.View
              style={[
                { borderRadius: 10 },
                { backgroundColor: editableBgMail },
                !emailValid && { borderWidth: 1, borderColor: C.danger },
              ]}
            >
              <Animated.View style={emailValid ? undefined : emailShakeStyle}>
                <TextInput
                  ref={emailRef}
                  value={email}
                  onChangeText={(t) => setEmail(t)}
                  editable={editingEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={C.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{
                    color: C.inputText,
                    paddingVertical: Platform.select({ ios: 12, android: 10 }),
                    paddingHorizontal: 12,
                    fontSize: 16,
                  }}
                  underlineColorAndroid="transparent"
                  onEndEditing={() => {
                    if (email && !emailValid) runEmailShake();
                  }}
                  returnKeyType="done"
                />
              </Animated.View>
            </Animated.View>
            {!emailValid && (
              <Text style={{ color: C.danger, marginTop: 6, fontSize: 12 }}>
                Please enter a valid email.
              </Text>
            )}
          </View>

          {/* Save */}
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={dirty ? 0.9 : 1}
            disabled={!dirty}
            style={{
              backgroundColor: dirty ? C.success : "#94A3B8",
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 16 }}>
              {dirty ? "Save Changes" : "No Changes"}
            </Text>
          </TouchableOpacity>

          {/* tiny hint */}
          <Text style={{ color: C.textSec, fontSize: 12, marginTop: 8, marginBottom: 8 }}>
            Changes to your email may require re-verification.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
