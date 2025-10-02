// app/(tabs)/_layout.tsx
import * as React from "react";
import { Tabs } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  View,
  Text,
  Pressable,
  useColorScheme,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = React.ComponentProps<typeof FontAwesome>["name"];

// --- Layout sizing ---
const BAR_HEIGHT = 64; // visual height of the pill
const V_MARGIN = Platform.select({ ios: 4, android: 6 }) ?? 16; // distance from bottom
const H_MARGIN = 16;

// 🔹 Provide “how much space the content needs under the pill”
const ClearanceContext = React.createContext(0);
export const useTabBarClearance = () => React.useContext(ClearanceContext);

function useColors() {
  const isDark = useColorScheme() === "dark";
  const GRAY_100 = "#F3F4F6";
  const GRAY_900 = "#111827";
  const ACTIVE = isDark ? "#E5E7EB" : "#111827";
  const INACTIVE = isDark ? "#9CA3AF" : "#6B7280";
  const TAB_BG = isDark ? "#0B1220" : "#FFFFFF";
  const SCENE_BG = isDark ? GRAY_900 : GRAY_100;
  const HILITE = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)";
  const SHADOW = isDark ? "#000" : "#111827";
  return { ACTIVE, INACTIVE, TAB_BG, SCENE_BG, HILITE, SHADOW };
}

function AnimatedTabIcon({
  name,
  color,
  focused,
  label,
}: {
  name: IconName;
  color: string;
  focused: boolean;
  label: string;
}) {
  const scale = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.12 : 1,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  }, [focused]);

  // gentle spin for cog
  const rotation = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (name !== "cog") return;
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [name]);

  const rotate =
    name === "cog"
      ? rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] })
      : "0deg";

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ transform: [{ scale }, { rotate }] }}>
        <FontAwesome name={name} size={22} color={color} />
      </Animated.View>
      {/* hide label for active tab */}
      {!focused && (
        <Text style={{ marginTop: 4, fontSize: 11, color, fontWeight: "500" }}>
          {label}
        </Text>
      )}
    </View>
  );
}

// Floating pill tab bar (unchanged position: bottom = V_MARGIN)
function FloatingPillTabBar({ state, descriptors, navigation }: any) {
  const { ACTIVE, INACTIVE, TAB_BG, HILITE, SHADOW } = useColors();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: H_MARGIN,
        right: H_MARGIN,
        bottom: V_MARGIN,
      }}
    >
      <View
        style={{
          height: BAR_HEIGHT,
          borderRadius: 28,
          backgroundColor: TAB_BG,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 6,
          shadowColor: SHADOW,
        }}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          const pressScale = React.useRef(new Animated.Value(1)).current;
          const handlePressIn = () =>
            Animated.spring(pressScale, { toValue: 0.92, useNativeDriver: true }).start();
          const handlePressOut = () =>
            Animated.spring(pressScale, { toValue: 1, useNativeDriver: true }).start();

          const color = isFocused ? ACTIVE : INACTIVE;
          const iconName: IconName = options.tabBarIconName as IconName;

          return (
            <Animated.View
              key={route.key}
              style={{ flex: 1, transform: [{ scale: pressScale }] }}
            >
              <Pressable
                onPress={onPress}
                onLongPress={onLongPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={{
                  paddingVertical: 8,
                  marginHorizontal: 6,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: BAR_HEIGHT - 16,
                  overflow: "hidden",
                }}
              >
                {isFocused && (
                  <View
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                      backgroundColor: HILITE,
                      borderRadius: 22,
                    }}
                  />
                )}
                <AnimatedTabIcon
                  name={iconName}
                  color={color}
                  focused={isFocused}
                  label={label}
                />
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { SCENE_BG, ACTIVE, INACTIVE } = useColors();
  const insets = useSafeAreaInsets();

  // ✅ Content clearance (space under screens so pill never covers content)
  // We do NOT include insets.bottom here because your app/_layout already adds it.
  const TAB_CLEARANCE = BAR_HEIGHT + V_MARGIN + 8; // bump the +8 if you want more space

  return (
    <ClearanceContext.Provider value={TAB_CLEARANCE}>
      <Tabs
        tabBar={(props) => <FloatingPillTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          // Global space for non-scrolling layouts
          sceneContainerStyle: {
            backgroundColor: SCENE_BG,
            paddingBottom: TAB_CLEARANCE,
          },
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: ACTIVE,
          tabBarInactiveTintColor: INACTIVE,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{ title: "Feed", tabBarIconName: "list" as IconName }}
        />
        <Tabs.Screen
          name="create-post"
          options={{ title: "Create", tabBarIconName: "plus-square" as IconName }}
        />
        <Tabs.Screen
          name="leaderboard"
          options={{ title: "Leaders", tabBarIconName: "trophy" as IconName }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: "Settings", tabBarIconName: "cog" as IconName }}
        />
      </Tabs>
    </ClearanceContext.Provider>
  );
}
