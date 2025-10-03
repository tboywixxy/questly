import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useState, useMemo } from "react";
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
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreatePostTab() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";

  const C = useMemo(
    () => ({
      pageBg: isDark ? "#0B1220" : "#F7F7FB",
      cardBg: isDark ? "#121A2A" : "#FFFFFF",
      border: isDark ? "#243149" : "#E7E8EC",
      text: isDark ? "#FFFFFF" : "#0B1220",
      subtext: isDark ? "#9FB0CF" : "#61708A",
      blue: "#2563EB",
      green: "#16A34A",
      red: "#EF4444",
      dashed: isDark ? "#32405F" : "#CBD5E1",
      chipBg: isDark ? "rgba(255,255,255,0.06)" : "#F2F4F8",
    }),
    [isDark]
  );

  const [content, setContent] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const canContinue = content.trim().length > 0 || !!imageUri;

  async function requestMediaPerm() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access.");
      return false;
    }
    return true;
  }
  async function requestCameraPerm() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow camera access.");
      return false;
    }
    return true;
  }

  async function pickFromGallery() {
    const ok = await requestMediaPerm();
    if (!ok) return;
    setPicking(true);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });
      if (!res.canceled && res.assets?.length) {
        const uri = res.assets[0].uri;
        setImageUri(uri);
        router.push({
          pathname: "/edit",
          params: { imageUri: uri, content: content.trim() },
        });
      }
    } finally {
      setPicking(false);
    }
  }

  async function openCamera() {
    const ok = await requestCameraPerm();
    if (!ok) return;
    setPicking(true);
    try {
      const res = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (!res.canceled && res.assets?.length) {
        const uri = res.assets[0].uri;
        setImageUri(uri);
        router.push({
          pathname: "/edit",
          params: { imageUri: uri, content: content.trim() },
        });
      }
    } finally {
      setPicking(false);
    }
  }

  function continueToEditor() {
    if (!canContinue) {
      Alert.alert("Empty", "Pick an image or write something.");
      return;
    }
    router.push({
      pathname: "/edit",
      params: { imageUri: imageUri ?? "", content: content.trim() },
    });
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView
        edges={["left", "right", "bottom"]}
        style={{ flex: 1, backgroundColor: C.pageBg }}
      >
        {/* Header (56px tall: used as offset for iOS padding behavior if you ever switch headers on) */}
        <View
          style={{
            height: 56,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "800", color: C.text }}>Create</Text>

          <TouchableOpacity
            disabled={!canContinue || picking}
            onPress={continueToEditor}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: !canContinue || picking ? `${C.green}66` : C.green,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            {picking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700" }}>Continue</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.select({ ios: "padding", android: "height" })}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.select({ ios: "interactive", android: "on-drag" })}
            contentInsetAdjustmentBehavior="always"
            showsVerticalScrollIndicator={false}
          >
            {/* Caption card */}
            <View
              style={{
                backgroundColor: C.cardBg,
                borderColor: C.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 14,
                marginTop: 8,
              }}
            >
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="What's new?"
                placeholderTextColor={C.subtext}
                multiline
                style={{
                  minHeight: 120,
                  color: C.text,
                  textAlignVertical: "top",
                  fontSize: 16,
                }}
                maxLength={500}
                returnKeyType="done"
                blurOnSubmit
              />
              <View
                style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}
              >
                <Text style={{ color: C.subtext, fontSize: 12 }}>
                  Share a quick thought or add a photo.
                </Text>
                <Text style={{ color: C.subtext, fontSize: 12 }}>{content.length}/500</Text>
              </View>
            </View>

            {/* Image area */}
            {imageUri ? (
              <View
                style={{
                  marginTop: 16,
                  backgroundColor: C.cardBg,
                  borderColor: C.border,
                  borderWidth: 1,
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: "100%", height: 240 }}
                  resizeMode="cover"
                />
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    padding: 12,
                    borderTopWidth: 1,
                    borderTopColor: C.border,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setImageUri(null)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: C.chipBg,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color={C.red} />
                    <Text style={{ color: C.red, fontWeight: "700" }}>Remove</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={pickFromGallery}
                    disabled={picking}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: C.border,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {picking ? (
                      <ActivityIndicator />
                    ) : (
                      <>
                        <Ionicons name="images-outline" size={16} color={C.text} />
                        <Text style={{ color: C.text, fontWeight: "700" }}>Change</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View
                style={{
                  marginTop: 16,
                  borderWidth: 2,
                  borderStyle: "dashed",
                  borderColor: C.dashed,
                  backgroundColor: C.cardBg,
                  borderRadius: 16,
                  paddingVertical: 28,
                  paddingHorizontal: 16,
                  alignItems: "center",
                }}
              >
                <Ionicons name="image-outline" size={42} color={C.subtext} />
                <Text style={{ color: C.text, fontWeight: "700", marginTop: 10, fontSize: 16 }}>
                  Add an image
                </Text>
                <Text style={{ color: C.subtext, marginTop: 6, textAlign: "center" }}>
                  Pick from gallery or snap a photo. We’ll open the editor right after.
                </Text>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                  <TouchableOpacity
                    onPress={pickFromGallery}
                    disabled={picking}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: C.border,
                      backgroundColor: C.chipBg,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {picking ? (
                      <ActivityIndicator />
                    ) : (
                      <>
                        <Ionicons name="images-outline" size={18} color={C.text} />
                        <Text style={{ color: C.text, fontWeight: "700" }}>Gallery</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={openCamera}
                    disabled={picking}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      backgroundColor: C.blue,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {picking ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="camera-outline" size={18} color="#fff" />
                        <Text style={{ color: "#fff", fontWeight: "700" }}>Camera</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
