import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
} from "react-native";
import { supabase } from "../../src/services/supabase";

const BUCKET = "post_media";

export default function CreatePostTab() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Theme palette (Tailwind-ish grays)
  const COLORS = {
    pageBg: isDark ? "#111827" : "#F3F4F6",        // gray-900 : gray-100
    cardBg: isDark ? "#1F2937" : "#FFFFFF",        // gray-800 : white
    border: isDark ? "#374151" : "#D1D5DB",        // gray-700 : gray-300
    textPrimary: isDark ? "#FFFFFF" : "#111827",   // white : gray-900
    textSecondary: isDark ? "#D1D5DB" : "#4B5563", // gray-300 : gray-600
    inputBg: isDark ? "#1F2937" : "#FFFFFF",       // match card
    inputText: isDark ? "#F9FAFB" : "#111827",     // gray-50 : gray-900
    placeholder: isDark ? "#9CA3AF" : "#6B7280",   // gray-400 : gray-500
    brandBlue: "#2563EB",
    danger: "#DC2626",
    success: "#16A34A",
  };

  const [content, setContent] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.length) setImageUri(res.assets[0].uri);
  }

  async function uploadIfAny(userId: string) {
    if (!imageUri) return null;
    const file = await fetch(imageUri);
    // @ts-ignore React Native fetch supports arrayBuffer at runtime
    const buf: ArrayBuffer = await file.arrayBuffer();
    const path = `${userId}/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function handlePost() {
    if (saving) return; // prevent double taps
    if (!content.trim() && !imageUri) {
      Alert.alert("Empty", "Write something or add an image.");
      return;
    }
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Login required", "Please sign in first.");
        return;
      }

      const mediaUrl = await uploadIfAny(user.id);
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim(),
        media_url: mediaUrl,
      });
      if (error) throw error;

      setContent("");
      setImageUri(null);
      Alert.alert("Posted", "Your post is live!");
      Keyboard.dismiss();
    } catch (e: any) {
      Alert.alert("Post failed", e?.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        key={colorScheme} // 👈 instant re-mount on theme change
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, backgroundColor: COLORS.pageBg, paddingHorizontal: 24, paddingVertical: 32 }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 24 }}>
            Create
          </Text>

          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="What's new?"
            placeholderTextColor={COLORS.placeholder}
            multiline
            style={{
              minHeight: 120,
              borderWidth: 1,
              borderColor: COLORS.border,
              backgroundColor: COLORS.inputBg,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
              color: COLORS.inputText,
              marginBottom: 16,
              textAlignVertical: "top",
            }}
            returnKeyType="done"
          />

          {imageUri ? (
            <View style={{ marginBottom: 16 }}>
              <Image
                source={{ uri: imageUri }}
                style={{ width: "100%", height: 224, borderRadius: 16 }}
                resizeMode="cover"
              />
              <TouchableOpacity onPress={() => setImageUri(null)} style={{ marginTop: 8 }}>
                <Text style={{ color: COLORS.danger, fontWeight: "600" }}>Remove image</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={pickImage}
              activeOpacity={0.9}
              style={{
                backgroundColor: COLORS.cardBg,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text style={{ color: COLORS.brandBlue, fontWeight: "600" }}>Add image</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            disabled={saving}
            onPress={handlePost}
            activeOpacity={0.9}
            style={{
              backgroundColor: saving ? "#16A34A99" : COLORS.success,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ textAlign: "center", color: "#FFFFFF", fontWeight: "600", fontSize: 18 }}>
              {saving ? "Posting..." : "Post"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
