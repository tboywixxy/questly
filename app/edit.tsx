// app/edit.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
  Switch,
  StyleSheet,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import ViewShot from "react-native-view-shot";
import { supabase } from "../src/services/supabase";

const BUCKET = "post_media";
const MAX_CHARS = 70;

const TINTS = [
  { key: "none",    label: "None",    solid: "#111827", overlay: "transparent" },
  { key: "warm",    label: "Warm",    solid: "#F472B6", overlay: "rgba(244,114,182,0.22)" },
  { key: "cool",    label: "Cool",    solid: "#3B82F6", overlay: "rgba(59,130,246,0.22)" },
  { key: "sepia",   label: "Sepia",   solid: "#8B5E3C", overlay: "rgba(112,66,20,0.22)" },
  { key: "mono",    label: "Mono",    solid: "#111827", overlay: "rgba(17,24,39,0.28)" },
  { key: "vibrant", label: "Vibrant", solid: "#10B981", overlay: "rgba(16,185,129,0.22)" },
  { key: "rose",    label: "Rose",    solid: "#F43F5E", overlay: "rgba(244,63,94,0.22)" },
  { key: "teal",    label: "Teal",    solid: "#0D9488", overlay: "rgba(13,148,136,0.22)" },
  { key: "gold",    label: "Gold",    solid: "#EAB308", overlay: "rgba(234,179,8,0.22)" },
];

const FONTS = [
  { key: "system", label: "System", family: Platform.select({ ios: "System", android: "sans-serif" }) },
  { key: "serif",  label: "Serif",  family: Platform.select({ ios: "Georgia", android: "serif" }) },
  { key: "mono",   label: "Mono",   family: Platform.select({ ios: "Courier New", android: "monospace" }) },
];

export default function EditPostScreen() {
  const { imageUri = "", content = "" } = useLocalSearchParams<{ imageUri?: string; content?: string }>();
  const router = useRouter();
  const isDark = useColorScheme() === "dark";

  const COLORS = {
    pageBg: isDark ? "#0B1220" : "#F3F4F6",
    cardBg: isDark ? "#111827" : "#FFFFFF",
    border: isDark ? "#25314A" : "#E5E7EB",
    textPrimary: isDark ? "#FFFFFF" : "#111827",
    textSecondary: isDark ? "#A6B3CC" : "#4B5563",
    inputBg: isDark ? "#0F172A" : "#FFFFFF",
    inputText: isDark ? "#F9FAFB" : "#111827",
    placeholder: isDark ? "#94A3B8" : "#6B7280",
    brandBlue: "#2563EB",
    danger: "#DC2626",
    success: "#16A34A",
    chipBg: isDark ? "#0F172A" : "#F3F4F6",
    chipDisabled: isDark ? "#0B1220" : "#E5E7EB",
  };

  // Media + caption (mutually exclusive)
  const [photo, setPhoto] = useState<string>(String(imageUri || ""));
  const [caption, setCaption] = useState(String(content || "").slice(0, MAX_CHARS));

  // Track photo natural size to preserve aspect ratio (no crop)
  const [photoSize, setPhotoSize] = useState<{ w: number; h: number } | null>(null);

  // Editor controls (text-only)
  const [tint, setTint] = useState<string>("none");
  const [fontKey, setFontKey] = useState<string>("system");
  const [fontSize, setFontSize] = useState<number>(22);
  const [isBold, setIsBold] = useState<boolean>(false);
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  const [lightText, setLightText] = useState(true); // text color on tint bg

  // Location (optional)
  const [attachLoc, setAttachLoc] = useState(false);
  const [placeName, setPlaceName] = useState<string | null>(null);

  // Save
  const [saving, setSaving] = useState(false);

  // ViewShot ref for capturing text-only stage
  const stageRef = useRef<ViewShot>(null);

  // ViewShot options: iOS → base64; Android → tmpfile
  const viewShotOptions =
    Platform.OS === "ios"
      ? ({ format: "jpg", quality: 0.92, result: "base64" } as const)
      : ({ format: "jpg", quality: 0.92, result: "tmpfile" } as const);

  useEffect(() => {
    setPhoto(String(imageUri || ""));
    setCaption(String(content || "").slice(0, MAX_CHARS));
  }, [imageUri, content]);

  // When photo changes, fetch its intrinsic size
  useEffect(() => {
    if (!photo) {
      setPhotoSize(null);
      return;
    }
    Image.getSize(
      photo,
      (w, h) => setPhotoSize({ w, h }),
      () => setPhotoSize(null)
    );
  }, [photo]);

  const hasText = caption.trim().length > 0;
  const hasPhoto = !!photo;

function onChangeCaption(v: string) {
  const next = v.slice(0, MAX_CHARS);
  setCaption(next); // allow caption even when an image is selected
}

  async function changeImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.95,
    });
    if (!res.canceled && res.assets?.length) {
        setPhoto(res.assets[0].uri); // keep any caption the user already typed
        }
  }

  const selectedTint = useMemo(() => TINTS.find((t) => t.key === tint)!, [tint]);
  const solidBg = selectedTint?.solid ?? "#111827";
  const overlayColor = selectedTint?.overlay ?? "transparent";
  const textOnSolid = lightText ? "#FFFFFF" : "#111827";

  function currentFontFamily() {
    const f = FONTS.find((x) => x.key === fontKey);
    return f?.family || FONTS[0].family!;
  }

  // request location only if toggled on
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!attachLoc) {
        setPlaceName(null);
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow location access to attach your location.");
        setAttachLoc(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const rev = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (cancel) return;
      const first = rev?.[0];
      if (first) {
        const state = first.region || first.city || first.subregion || "";
        const country = first.country || "";
        const label = [state, country].filter(Boolean).join(", ");
        setPlaceName(label || null);
      } else {
        setPlaceName(null);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [attachLoc]);

  // ---------- Upload helpers ----------
  // Upload local file (file://) using arrayBuffer (Android & any tmpfile path)
  async function uploadFile(localUri: string, contentType: string) {
    const response = await fetch(localUri);
    const data: ArrayBuffer = await response.arrayBuffer();

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) throw new Error("Not authenticated");

    const path = `${user.id}/${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, data, {
      contentType,
      upsert: true,
    });
    if (upErr) throw upErr;

    // Try public URL; fall back to signed if bucket isn't public
    const { data: pub } = await supabase.storage.from(BUCKET).getPublicUrl(path);
    let url = pub.publicUrl;
    if (!url) {
      const { data: signed } = await supabase
        .storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      url = signed?.signedUrl ?? "";
    }
    return url;
  }

  // Base64 -> Uint8Array for iOS text-only capture
  function base64ToUint8Array(base64: string) {
    const binary = (global as any).atob
      ? (global as any).atob(base64)
      : Buffer.from(base64, "base64").toString("binary");
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  // Upload base64 jpg (iOS text-only path)
  async function uploadBase64Jpg(base64: string) {
    const bytes = base64ToUint8Array(base64);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) throw new Error("Not authenticated");

    const path = `${user.id}/${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (upErr) throw upErr;

    const { data: pub } = await supabase.storage.from(BUCKET).getPublicUrl(path);
    let url = pub.publicUrl;
    if (!url) {
      const { data: signed } = await supabase
        .storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      url = signed?.signedUrl ?? "";
    }
    return url;
  }
  // ------------------------------------

  async function saveAndPost() {
    try {
      const hasAny = hasPhoto || hasText;
      if (!hasAny) {
        Alert.alert("Empty", "Write something or add an image.");
        return;
      }

      setSaving(true);

      let mediaUrl: string | null = null;
      let finalContent: string | null = null;

      if (hasPhoto && !hasText) {
        // IMAGE ONLY -> upload the original photo as-is
        mediaUrl = await uploadFile(photo, "image/jpeg");
        finalContent = null;
      } else if (!hasPhoto && hasText) {
        // TEXT ONLY -> capture the stage (tint + centered text) as an image
        if (!stageRef.current) throw new Error("Stage not ready to capture");

        // Ensure layout is flushed before capture (iOS especially)
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        if (Platform.OS === "ios") {
          // @ts-ignore: capture exists on ViewShot, returns base64 with our options
          const b64: string = await stageRef.current.capture();
          mediaUrl = await uploadBase64Jpg(b64);
        } else {
          // @ts-ignore: capture exists on ViewShot, returns tmpfile path on Android
          const uri: string = await stageRef.current.capture();
          mediaUrl = await uploadFile(uri, "image/jpeg");
        }
        finalContent = null; // image-only on feed
      }

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Not authenticated");

      const { error: insErr } = await supabase.from("posts").insert({
        user_id: user.id,
        content: finalContent,   // null for both image-only and text-as-image
        media_url: mediaUrl,     // always set
        place_name: attachLoc ? placeName : null,
      });
      if (insErr) throw insErr;

      Alert.alert("Posted", "Your post is live!");
      router.replace("/(tabs)/home");
    } catch (e: any) {
      Alert.alert("Post failed", e?.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

const textMode = !hasPhoto && hasText; 
const imageMode = hasPhoto;           
const addImageDisabled = false;        
const textInputDisabled = false;       
  const controlsDisabledOpacity = textMode ? 1 : 0.5;

  // Square for text-only; photo ratio for images
  const stageAspect = imageMode && photoSize ? photoSize.w / photoSize.h : 1;

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding" })} style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: COLORS.pageBg }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 42 }}
          keyboardShouldPersistTaps="handled"
          bounces
        >
          {/* Stage (captured into an image when text-only) */}
          <ViewShot
            ref={stageRef}
            options={viewShotOptions}
            style={{ backgroundColor: COLORS.pageBg }}
            collapsable={false} // ensure native view exists for capture
          >
            <View
              style={{
                width: "100%",
                aspectRatio: stageAspect,
                backgroundColor: imageMode ? "#000" : solidBg,
                position: "relative",
                alignItems: "center",
                justifyContent: "center", // centers text in text-only
                paddingHorizontal: imageMode ? 0 : 24,
              }}
            >
              {imageMode ? (
                <>
                  <Image
                    source={{ uri: photo }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="contain"
                  />
                  {overlayColor !== "transparent" && (
                    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: overlayColor }} />
                  )}
                </>
              ) : textMode ? (
                <Text
                  style={{
                    color: textOnSolid,
                    textAlign: align,
                    fontFamily: currentFontFamily(),
                    fontSize,
                    fontWeight: isBold ? "700" : "400",
                    textShadowColor: "rgba(0,0,0,0.25)",
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}
                >
                  {caption}
                </Text>
              ) : (
                <Text style={{ color: "#FFFFFFAA" }}>Write something…</Text>
              )}
            </View>
          </ViewShot>

          {/* Controls */}
          <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
            {/* Row: Add/Change Image & Char Counter */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <TouchableOpacity
                onPress={changeImage}
                disabled={addImageDisabled}
                style={[
                  chipStyle(COLORS),
                  addImageDisabled && { backgroundColor: COLORS.chipDisabled, borderColor: COLORS.border, opacity: 0.6 },
                ]}
              >
                <Text style={{ color: addImageDisabled ? COLORS.textSecondary : COLORS.brandBlue, fontWeight: "700" }}>
                  {imageMode ? "Change image" : "Add image"}
                </Text>
              </TouchableOpacity>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
                {caption.length}/{MAX_CHARS}
              </Text>
            </View>

            {/* Caption Input (disabled when image is selected) */}
            <TextInput
              value={caption}
              onChangeText={onChangeCaption}
              placeholder={imageMode ? "Caption disabled (image-only)" : "Write a caption…"}
              placeholderTextColor={COLORS.placeholder}
              editable={!textInputDisabled}
              style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.inputBg,
                color: COLORS.inputText,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 12,
              }}
              multiline
              textAlignVertical="top"
            />

            {/* Tints + Font controls (only for text-only) */}
            <View style={{ opacity: controlsDisabledOpacity }}>
              {/* Tints */}
              <Text style={{ color: COLORS.textPrimary, fontWeight: "700", marginBottom: 6 }}>Tints</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
                {TINTS.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => textMode && setTint(t.key)}
                    disabled={!textMode}
                    style={[
                      chipStyle(COLORS),
                      {
                        borderColor: tint === t.key ? COLORS.brandBlue : COLORS.border,
                        backgroundColor: tint === t.key ? "#2563EB22" : COLORS.chipBg,
                        marginRight: 8,
                        marginBottom: 8,
                      },
                      !textMode && { opacity: 0.6 },
                    ]}
                  >
                    <Text
                      style={{
                        color: tint === t.key ? COLORS.brandBlue : COLORS.textPrimary,
                        fontWeight: "600",
                      }}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Font controls */}
              <Text style={{ color: COLORS.textPrimary, fontWeight: "700", marginBottom: 6 }}>Font</Text>
              <View style={{ flexDirection: "row", marginBottom: 12 }}>
                {FONTS.map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => textMode && setFontKey(f.key)}
                    disabled={!textMode}
                    style={[
                      chipStyle(COLORS),
                      {
                        borderColor: fontKey === f.key ? COLORS.brandBlue : COLORS.border,
                        backgroundColor: fontKey === f.key ? "#2563EB22" : COLORS.chipBg,
                        marginRight: 8,
                      },
                      !textMode && { opacity: 0.6 },
                    ]}
                  >
                    <Text
                      style={{
                        color: fontKey === f.key ? COLORS.brandBlue : COLORS.textPrimary,
                        fontWeight: "600",
                      }}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                <TouchableOpacity
                  onPress={() => textMode && setFontSize((s) => Math.max(14, s - 2))}
                  disabled={!textMode}
                  style={[chipStyle(COLORS), !textMode && { opacity: 0.6 }]}
                >
                  <Text style={{ color: COLORS.textPrimary, fontWeight: "700" }}>A-</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => textMode && setFontSize((s) => Math.min(42, s + 2))}
                  disabled={!textMode}
                  style={[chipStyle(COLORS), { marginLeft: 8 }, !textMode && { opacity: 0.6 }]}
                >
                  <Text style={{ color: COLORS.textPrimary, fontWeight: "700" }}>A+</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => textMode && setIsBold((b) => !b)}
                  disabled={!textMode}
                  style={[chipStyle(COLORS), { marginLeft: 12 }, !textMode && { opacity: 0.6 }]}
                >
                  <Text style={{ color: isBold ? COLORS.brandBlue : COLORS.textPrimary, fontWeight: "800" }}>
                    Bold
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => textMode && setAlign("left")}
                  disabled={!textMode}
                  style={[
                    chipStyle(COLORS),
                    { marginLeft: 12, borderColor: align === "left" ? COLORS.brandBlue : COLORS.border },
                    !textMode && { opacity: 0.6 },
                  ]}
                >
                  <Text style={{ color: align === "left" ? COLORS.brandBlue : COLORS.textPrimary }}>Left</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => textMode && setAlign("center")}
                  disabled={!textMode}
                  style={[
                    chipStyle(COLORS),
                    { marginLeft: 8, borderColor: align === "center" ? COLORS.brandBlue : COLORS.border },
                    !textMode && { opacity: 0.6 },
                  ]}
                >
                  <Text style={{ color: align === "center" ? COLORS.brandBlue : COLORS.textPrimary }}>Center</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => textMode && setAlign("right")}
                  disabled={!textMode}
                  style={[
                    chipStyle(COLORS),
                    { marginLeft: 8, borderColor: align === "right" ? COLORS.brandBlue : COLORS.border },
                    !textMode && { opacity: 0.6 },
                  ]}
                >
                  <Text style={{ color: align === "right" ? COLORS.brandBlue : COLORS.textPrimary }}>Right</Text>
                </TouchableOpacity>

                {/* Text color toggle (text-only) */}
                <TouchableOpacity
                  onPress={() => textMode && setLightText((v) => !v)}
                  disabled={!textMode}
                  style={[chipStyle(COLORS), { marginLeft: 12 }, !textMode && { opacity: 0.6 }]}
                >
                  <Text style={{ color: COLORS.textPrimary, fontWeight: "700" }}>
                    {lightText ? "Light Text" : "Dark Text"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Location toggle (optional) */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 8,
                marginBottom: 16,
              }}
            >
              <View>
                <Text style={{ color: COLORS.textPrimary, fontWeight: "700" }}>Attach location</Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
                  {attachLoc ? placeName || "Detecting…" : "Off"}
                </Text>
              </View>
              <Switch value={attachLoc} onValueChange={setAttachLoc} />
            </View>
          </View>

          {/* Footer actions */}
          <View style={{ paddingHorizontal: 16 }}>
            <TouchableOpacity
              disabled={saving}
              onPress={saveAndPost}
              style={{
                backgroundColor: saving ? "#16A34A99" : COLORS.success,
                paddingVertical: 12,
                borderRadius: 12,
                marginBottom: 8,
              }}
            >
              <Text style={{ textAlign: "center", color: "#FFF", fontWeight: "700", fontSize: 18 }}>
                {saving ? "Posting..." : "Post"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// --- helpers ---
function chipStyle(COLORS: any) {
  return {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.chipBg,
  } as const;
}
