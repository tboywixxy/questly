import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { supabase } from "../src/services/supabase";

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // form fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // originals (to detect changes)
  const [origUsername, setOrigUsername] = useState("");
  const [origEmail, setOrigEmail] = useState("");
  const [origAvatar, setOrigAvatar] = useState<string | null>(null);

  // per-field edit toggles
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);

  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  // whether profiles.avatar_url exists
  const [hasAvatarColumn, setHasAvatarColumn] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
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
          // if avatar column missing, fall back
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
  }, []);

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
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      // save local uri for preview; we upload on Save
      setAvatarUrl(result.assets[0].uri);
    }
  }

  // ✅ Use arrayBuffer instead of blob()
  async function uploadAvatarIfNeeded(userId: string) {
    if (!hasAvatarColumn) return origAvatar ?? null;
    if (!avatarUrl) return origAvatar ?? null;
    if (avatarUrl.startsWith("http")) return avatarUrl; // already a public URL

    // Fetch the local file and turn it into an ArrayBuffer
    const res = await fetch(avatarUrl);
    // @ts-ignore: arrayBuffer exists in RN fetch Response
    const buffer: ArrayBuffer = await res.arrayBuffer();

    const path = `${userId}/${Date.now()}.jpg`;
    const { error: uploadErr } = await supabase
      .storage
      .from("avatars")
      .upload(path, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSave() {
    try {
      setLoading(true);
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) throw userErr ?? new Error("Not authenticated");

      // 1) Upload avatar if changed and if column exists
      let finalAvatarUrl = origAvatar;
      if (hasAvatarColumn && avatarUrl !== origAvatar) {
        finalAvatarUrl = await uploadAvatarIfNeeded(user.id);
      }

      // 2) Upsert profile (creates or updates your row)
      const updates: Record<string, any> = {
        id: user.id,       // required for upsert on PK
        username,
        email,
      };
      if (hasAvatarColumn) updates.avatar_url = finalAvatarUrl ?? null;

      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert(updates)
        .eq("id", user.id);

      if (profileErr) throw profileErr;

      // 3) If email changed, also update auth user
      if (email && email !== origEmail) {
        const { error: emailErr } = await supabase.auth.updateUser({ email });
        if (emailErr) throw emailErr;
      }

      // sync originals, exit edit state
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
      if (next) setTimeout(() => usernameRef.current?.focus(), 50);
      return next;
    });
  }
  function toggleEditEmail() {
    setEditingEmail((prev) => {
      const next = !prev;
      if (next) setTimeout(() => emailRef.current?.focus(), 50);
      return next;
    });
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100 dark:bg-gray-900">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100 dark:bg-gray-900 px-6 py-8">
      {/* Avatar */}
      <View className="items-center mb-10">
        <TouchableOpacity
          onPress={pickImage}
          className="w-52 h-52 rounded-full overflow-hidden"
          activeOpacity={0.8}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} className="w-full h-full" />
          ) : (
            <View className="w-full h-full items-center justify-center bg-gray-200 dark:bg-gray-700">
              <Text className="text-gray-600 dark:text-gray-300">
                {hasAvatarColumn ? "Add Photo" : "No Photo"}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        {hasAvatarColumn && (
          <Text className="mt-2 text-sm text-gray-500">Tap to upload</Text>
        )}
      </View>

      {/* Username row */}
      <View className="mb-8">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs uppercase tracking-wider text-gray-500">
            Username
          </Text>
          <TouchableOpacity onPress={toggleEditUsername} hitSlop={8}>
            <Text className="text-blue-600 font-semibold">
              {editingUsername ? "Done" : "Edit"}
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          ref={usernameRef}
          value={username}
          onChangeText={setUsername}
          editable={editingUsername}
          placeholder="Enter your username"
          className="text-base text-gray-900 dark:text-white bg-transparent"
          style={{ borderWidth: 0 }}
          underlineColorAndroid="transparent"
        />
      </View>

      {/* Email row */}
      <View className="mb-10">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs uppercase tracking-wider text-gray-500">
            Email
          </Text>
          <TouchableOpacity onPress={toggleEditEmail} hitSlop={8}>
            <Text className="text-blue-600 font-semibold">
              {editingEmail ? "Done" : "Edit"}
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          ref={emailRef}
          value={email}
          onChangeText={setEmail}
          editable={editingEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          className="text-base text-gray-900 dark:text-white bg-transparent"
          style={{ borderWidth: 0 }}
          underlineColorAndroid="transparent"
        />
      </View>

      <TouchableOpacity
        onPress={handleSave}
        className="bg-green-600 py-3 rounded-xl"
        activeOpacity={0.9}
      >
        <Text className="text-center text-white font-semibold text-lg">Save</Text>
      </TouchableOpacity>
    </View>
  );
}
