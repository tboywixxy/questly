// app/onboarding.tsx (JS-safe)
import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  useColorScheme,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");
const LOGO = require("../../assets/images/logo-em-bg-black.png"); // your logo

const SLIDES = [
  {
    key: "one",
    title: "Welcome to Questly",
    subtitle: "Share moments, discover people, and grow your community.",
    tint: "#60A5FA",
    bg: "#0B1220",
  },
  {
    key: "two",
    title: "Create. React. Connect.",
    subtitle: "Post updates, comment instantly, and celebrate wins together.",
    tint: "#34D399",
    bg: "#0D1326",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const isDark = true; // design choice for this screen

  useEffect(() => {
    if (Platform.OS !== "android") StatusBar.setBarStyle("light-content");
  }, []);

  const dotInactive = isDark ? "#26314A" : "#CBD5E1";
  const dotActive = SLIDES[index]?.tint || "#2563EB";

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      setIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    } else {
      // Finished -> go to Register.
      // (We DO NOT set @onboarding_done here;
      //  app/index.tsx will set it after real login/registration)
      router.replace("/(auth)/register");
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.[0]?.index != null) setIndex(viewableItems[0].index);
  }).current;

  const viewabilityConfig = useMemo(
    () => ({ viewAreaCoveragePercentThreshold: 60 }),
    []
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: SLIDES[index]?.bg || "#0B1220" }}>
      {/* Brand strip (logo off-center) */}
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6, flexDirection: "row", alignItems: "center" }}>
        <Image
          source={LOGO}
          style={{ width: 44, height: 44, borderRadius: 10, marginRight: 10 }}
          resizeMode="contain"
        />
        <Text style={{ color: "#E5E7EB", fontSize: 18, fontWeight: "800", letterSpacing: 0.2 }}>
          Questly
        </Text>
      </View>

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View
            style={{
              width,
              flex: 1,
              backgroundColor: item.bg,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 24,
            }}
          >
            {/* Decorative accent shapes */}
            <View
              style={{
                position: "absolute",
                right: -60,
                top: 84,
                width: 230,
                height: 230,
                borderRadius: 120,
                backgroundColor: item.tint,
                opacity: 0.22,
                transform: [{ rotate: "18deg" }],
              }}
            />
            <View
              style={{
                position: "absolute",
                left: -40,
                bottom: 120,
                width: 170,
                height: 170,
                borderRadius: 90,
                backgroundColor: item.tint,
                opacity: 0.12,
                transform: [{ rotate: "-12deg" }],
              }}
            />

            {/* Body */}
            <View style={{ flex: 1, justifyContent: "center" }}>
              {/* Secondary logo placement (not centered) */}
              <Image
                source={LOGO}
                resizeMode="contain"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  marginBottom: 20,
                  alignSelf: "flex-start",
                  opacity: 0.95,
                }}
              />
              <Text style={{ color: "#F8FAFC", fontSize: 32, lineHeight: 38, fontWeight: "900" }}>
                {item.title}
              </Text>
              <Text style={{ color: "#C7CFDB", fontSize: 16, lineHeight: 24, marginTop: 12 }}>
                {item.subtitle}
              </Text>
            </View>

            {/* Footer controls */}
            <View style={{ alignItems: "center" }}>
              {/* Dots */}
              <View style={{ flexDirection: "row", marginBottom: 18 }}>
                {SLIDES.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: i === index ? 26 : 8,
                      height: 8,
                      borderRadius: 999,
                      marginHorizontal: 4,
                      backgroundColor: i === index ? dotActive : dotInactive,
                    }}
                  />
                ))}
              </View>

              {/* Primary CTA */}
              <Pressable
                onPress={goNext}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.9 : 1,
                  width: "100%",
                  backgroundColor: SLIDES[index]?.tint || "#2563EB",
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <Text style={{ color: "#0B1220", fontWeight: "900", fontSize: 16 }}>
                  {index === SLIDES.length - 1 ? "Get Started" : "Next"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
