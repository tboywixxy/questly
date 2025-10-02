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
} from "react-native";
import { supabase } from "../../src/services/supabase";

const BUCKET = "post_media";

export default function CreatePostTab() {
  const [content, setContent] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return Alert.alert("Permission needed", "Allow photo access.");
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
    if (!content.trim() && !imageUri) {
      Alert.alert("Empty", "Write something or add an image.");
      return;
    }
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return Alert.alert("Login required", "Please sign in first.");

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
        behavior={Platform.select({ ios: "padding", android: undefined })}
        className="flex-1"
      >
        <View className="flex-1 bg-gray-100 dark:bg-gray-900 px-6 py-8">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create</Text>

          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="What's new?"
            multiline
            className="min-h-[120px] border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 text-gray-900 dark:text-white mb-4"
            returnKeyType="done"
          />

          {imageUri ? (
            <View className="mb-4">
              <Image source={{ uri: imageUri }} className="w-full h-56 rounded-2xl" resizeMode="cover" />
              <TouchableOpacity onPress={() => setImageUri(null)} className="mt-2">
                <Text className="text-red-600 font-semibold">Remove image</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={pickImage} className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4">
              <Text className="text-blue-600 font-semibold">Add image</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            disabled={saving}
            onPress={handlePost}
            className="bg-green-600 py-3 rounded-xl"
            activeOpacity={0.9}
          >
            <Text className="text-center text-white font-semibold text-lg">
              {saving ? "Posting..." : "Post"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
