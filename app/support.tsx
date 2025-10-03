import React, { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; // ships with Expo (like FontAwesome you used)

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FaqItem = { q: string; a: string };

const FAQ: FaqItem[] = [
  {
    q: "What is Questly?",
    a: "Questly is a lightweight social app for quick, elegant sharing. Edit your photo with subtle tints, write a caption, and optionally attach your state and country.",
  },
  {
    q: "How do I edit photos before posting?",
    a: "Pick an image on Create—Questly opens the editor automatically so you can apply a tint and add a caption.",
  },
  {
    q: "Why can’t Questly see my location?",
    a: "Ensure location permission is granted in system settings. You can also toggle location on the editor screen.",
  },
  {
    q: "How do I report a bug?",
    a: "Use the contact options below and include device model, OS version, and a short video or screenshot.",
  },
];

function useTheme() {
  const isDark = useColorScheme() === "dark";
  return {
    isDark,
    C: {
      pageBg: isDark ? "#0B1220" : "#F5F7FB",
      // Cards use elevated, soft backgrounds
      cardBg: isDark ? "#111827" : "#FFFFFF",
      border: isDark ? "#293243" : "#E6E8EF",
      textPri: isDark ? "#F9FAFB" : "#0F172A",
      textSec: isDark ? "#C7D2FE" : "#475569",
      pill: isDark ? "#1F2937" : "#F1F5F9",
      accent: "#2563EB",
      accentSoft: "#2563EB11",
      success: "#16A34A",
      shadow: isDark ? "#00000060" : "#0B122015",
      hair: isDark ? "#1F2937" : "#EAECEF",
      // gradient-ish header fallback (no extra deps)
      heroTop: isDark ? "#0B1120" : "#EAF2FF",
      heroMid: isDark ? "#0D1426" : "#F3F7FF",
    },
  };
}

/** Animated Accordion Row (height + chevron rotation) */
function AnimatedAccordion({
  item,
  initiallyOpen = false,
}: {
  item: FaqItem;
  initiallyOpen?: boolean;
}) {
  const { C } = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  const contentH = useRef(0);
  const anim = useRef(new Animated.Value(initiallyOpen ? 1 : 0)).current;

  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const height = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentH.current || 0],
  });

  function toggle() {
    setOpen((prev) => !prev);
    Animated.timing(anim, {
      toValue: open ? 0 : 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // height animation can't use native driver
    }).start();
  }

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: C.hair }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={toggle}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: C.textPri, fontSize: 16, fontWeight: "600", flex: 1, paddingRight: 12 }}>
          {item.q}
        </Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={20} color={C.textSec} />
        </Animated.View>
      </TouchableOpacity>

      {/* Measure-once hidden content to drive height */}
      <View
        style={{ position: "absolute", left: 16, right: 16, opacity: 0 }}
        onLayout={(e) => {
          contentH.current = e.nativeEvent.layout.height + 14; // add bottom padding
          if (open) anim.setValue(1);
        }}
      >
        <Text style={{ color: C.textSec, lineHeight: 20, paddingBottom: 14 }}>{item.a}</Text>
      </View>

      <Animated.View style={{ height, overflow: "hidden" }}>
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ color: C.textSec, lineHeight: 20, paddingBottom: 14 }}>{item.a}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

export default function SupportScreen() {
  const { C } = useTheme();

  function open(url: string) {
    Linking.openURL(url).catch(() => {});
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.pageBg }}
      contentContainerStyle={{ paddingBottom: 36 }}
    >
      {/* HERO */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 20,
          backgroundColor: C.heroTop,
          borderBottomWidth: 1,
          borderBottomColor: C.hair,
        }}
      >
        <View
          style={{
            backgroundColor: C.heroMid,
            borderRadius: 20,
            padding: 16,
            shadowColor: C.shadow,
            shadowOpacity: 0.2,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 18,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: C.accentSoft,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="help-buoy" size={24} color={C.accent} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: C.textPri }}>Support</Text>
          </View>
          <Text style={{ color: C.textSec }}>
            Answers, tips, and ways to reach us. We’re here to help you get the most out of Questly.
          </Text>
        </View>
      </View>

      {/* BODY */}
      <View style={{ paddingHorizontal: 24, gap: 16, marginTop: 16 }}>
        {/* ABOUT */}
        <View
          style={{
            backgroundColor: C.cardBg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: C.textPri, marginBottom: 8 }}>
            About Questly
          </Text>
          <Text style={{ color: C.textSec, lineHeight: 20 }}>
            Questly is a simple social app focused on quick, elegant sharing. Apply subtle tints, write captions,
            and optionally attach your state and country. Built for speed, privacy, and ease.
          </Text>
        </View>

        {/* FAQ */}
        <View
          style={{
            backgroundColor: C.cardBg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            overflow: "hidden",
          }}
        >
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: C.textPri }}>FAQs</Text>
          </View>

          {FAQ.map((it, idx) => (
            <AnimatedAccordion key={idx} item={it} initiallyOpen={idx === 0} />
          ))}
        </View>

        {/* CONTACT / LINKS */}
        <View
          style={{
            backgroundColor: C.cardBg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            paddingVertical: 8,
          }}
        >
          <RowLink
            icon="globe-outline"
            label="Website"
            value="questly.example.com"
            onPress={() => open("https://questly.example.com")}
            C={C}
          />
          <Divider C={C} />
          <RowLink
            icon="mail-outline"
            label="Email"
            value="support@questly.example.com"
            onPress={() => open("mailto:support@questly.example.com")}
            C={C}
          />
          <Divider C={C} />
          <RowLink
            icon="logo-xing"
            label="X (Twitter)"
            value="@questlyapp"
            onPress={() => open("https://x.com")}
            C={C}
          />
        </View>
      </View>
    </ScrollView>
  );
}

/** Reusable row with icon + label + value + chevron */
function RowLink({
  icon,
  label,
  value,
  onPress,
  C,
}: {
  icon: any;
  label: string;
  value: string;
  onPress: () => void;
  C: ReturnType<typeof useTheme>["C"];
}) {
  const press = () => onPress && onPress();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={press}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: C.pill,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Ionicons name={icon} size={18} color={C.textSec} />
        </View>
        <View>
          <Text style={{ color: C.textPri, fontWeight: "600" }}>{label}</Text>
          <Text style={{ color: C.textSec, fontSize: 12 }}>{value}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.textSec} />
    </TouchableOpacity>
  );
}

function Divider({ C }: { C: ReturnType<typeof useTheme>["C"] }) {
  return <View style={{ height: 1, backgroundColor: C.hair, marginHorizontal: 16 }} />;
}
