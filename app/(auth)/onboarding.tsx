import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  useColorScheme,
  Dimensions,
  StatusBar as RNStatusBar,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

const LOGO_DARK_BG  = require("../../assets/images/logo-em-bg-black.png"); 
const LOGO_LIGHT_BG = require("../../assets/images/logo-rm-bg-light.png"); 

function makeSlides(isDark: boolean) {
  if (isDark) {
    return [
      { key: "one", title: "Welcome to Questly", subtitle: "Share moments, discover people, and grow your community.", tint: "#60A5FA", bg: "#0B1220" },
      { key: "two", title: "Create. React. Connect.", subtitle: "Post updates, comment instantly, and celebrate wins together.", tint: "#34D399", bg: "#0D1326" },
    ];
  }
  return [
    { key: "one", title: "Welcome to Questly", subtitle: "Share moments, discover people, and grow your community.", tint: "#2563EB", bg: "#F5F7FB" },
    { key: "two", title: "Create. React. Connect.", subtitle: "Post updates, comment instantly, and celebrate wins together.", tint: "#10B981", bg: "#FFFFFF" },
  ];
}

export default function Onboarding() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const insets = useSafeAreaInsets();

  const LOGO = isDark ? LOGO_LIGHT_BG : LOGO_DARK_BG;

  const SLIDES = useMemo(() => makeSlides(isDark), [isDark]);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (Platform.OS !== "android") {
      RNStatusBar.setBarStyle(isDark ? "light-content" : "dark-content");
    }
  }, [isDark]);

  const isLast = index === SLIDES.length - 1;

  const goNext = () => {
    if (!isLast) {
      const next = index + 1;
      setIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    } else {
      router.push("/(auth)/register");
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index?: number }> }) => {
      if (viewableItems?.[0]?.index != null) setIndex(viewableItems[0].index!);
    }
  ).current;

  const viewabilityConfig = useMemo(
    () => ({ viewAreaCoveragePercentThreshold: 60 }),
    []
  );

  const titleColor = isDark ? "#F8FAFC" : "#0F172A";
  const subtitleColor = isDark ? "#C7CFDB" : "#475569";
  const headerTextColor = isDark ? "#E5E7EB" : "#0F172A";
  const headerBg = SLIDES[index]?.bg || (isDark ? "#0B1220" : "#FFFFFF");
  const accent = SLIDES[index]?.tint || (isDark ? "#60A5FA" : "#2563EB");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: headerBg }}>
      {/* Top Bar (pinned above slides) */}
      <View
        style={{
          paddingTop: Math.max(insets.top, 8),
          paddingHorizontal: 16,
          paddingBottom: 8,
          backgroundColor: headerBg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 100,
          elevation: 6,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image source={LOGO} style={{ width: 44, height: 44, borderRadius: 10, marginRight: 10 }} resizeMode="contain" />
          <Text style={{ color: headerTextColor, fontSize: 18, fontWeight: "800", letterSpacing: 0.2 }}>Questly</Text>
        </View>

        <Pressable
          onPress={goNext}
          style={({ pressed }) => ({
            opacity: pressed ? 0.9 : 1,
            backgroundColor: accent,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 999,
          })}
          accessibilityRole="button"
          accessibilityLabel="Next"
          testID="onboarding-next"
        >
          {/* label: black in LIGHT, white in DARK */}
          <Text style={{ color: isDark ? "#FFFFFF" : "#0B1220", fontWeight: "900" }}>Next</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        bounces={false}
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
            {/* Decorative shapes (behind header) */}
            <View
              style={{
                position: "absolute",
                right: -60,
                top: 84,
                width: 230,
                height: 230,
                borderRadius: 120,
                backgroundColor: item.tint,
                opacity: isDark ? 0.22 : 0.12,
                transform: [{ rotate: "18deg" }],
                zIndex: 0,
              }}
            />
            <View
              style={{
                position: "absolute",
                left: -40,
                bottom: 140,
                width: 170,
                height: 170,
                borderRadius: 90,
                backgroundColor: item.tint,
                opacity: isDark ? 0.12 : 0.08,
                transform: [{ rotate: "-12deg" }],
                zIndex: 0,
              }}
            />

            {/* Body */}
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Image
                source={LOGO}
                resizeMode="contain"
                style={{ width: 56, height: 56, borderRadius: 12, marginBottom: 20, alignSelf: "flex-start", opacity: 0.95 }}
              />
              <Text style={{ color: titleColor, fontSize: 32, lineHeight: 38, fontWeight: "900" }}>{item.title}</Text>
              <Text style={{ color: subtitleColor, fontSize: 16, lineHeight: 24, marginTop: 12 }}>{item.subtitle}</Text>
            </View>

            {/* Dots */}
            <View style={{ alignItems: "center" }}>
              <View style={{ flexDirection: "row" }}>
                {SLIDES.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: i === index ? 26 : 8,
                      height: 8,
                      borderRadius: 999,
                      marginHorizontal: 4,
                      backgroundColor: i === index ? accent : (isDark ? "#26314A" : "#CBD5E1"),
                    }}
                  />
                ))}
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
