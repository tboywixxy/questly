import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../src/services/supabase";

// Theme-aware logos (same assets as your auth screens)
const LOGO_LIGHT = require("../assets/images/logo-em-bg-black.png"); // for light mode
const LOGO_DARK  = require("../assets/images/logo-rm-bg-light.png");  // for dark mode

export default function PasswordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSave() {
    try {
      if (!newPassword || !confirm) {
        Alert.alert("Error", "Please fill both fields.");
        return;
      }
      if (newPassword.length < 6) {
        Alert.alert("Weak password", "Use at least 6 characters.");
        return;
      }
      if (newPassword !== confirm) {
        Alert.alert("Error", "Passwords do not match.");
        return;
      }

      setSaving(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        Alert.alert("Update failed", error.message);
        return;
      }

      Alert.alert("Success", "Password updated.");
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 #fff dark:bg-gray-900">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.select({ ios: "padding", android: "height" })}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 24 }}
        >
          {/* Title */}
          <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4 self-start">
            Change Password
          </Text>

          {/* Logo */}
          <View className="items-center mb-6">
            <Image
              source={isDark ? LOGO_DARK : LOGO_LIGHT}
              resizeMode="contain"
              accessibilityLabel="Questly logo"
              style={{ width: 120, height: 120 }}
            />
          </View>

          {/* New Password */}
          <View className="mb-6">
            <Text className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              New Password
            </Text>

            <View className="relative border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl">
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry={!showNew}
                autoCapitalize="none"
                className="px-4 pr-12 py-3 text-gray-900 dark:text-white"
                placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
              />
              <TouchableOpacity
                onPress={() => setShowNew((s) => !s)}
                accessibilityRole="button"
                accessibilityLabel={showNew ? "Hide password" : "Show password"}
                className="absolute right-3 top-0 bottom-0 justify-center items-center"
              >
                <Ionicons name={showNew ? "eye-off" : "eye"} size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-gray-500 mt-2">
              Tip: mix uppercase, lowercase, numbers, and symbols.
            </Text>
          </View>

          {/* Confirm Password */}
          <View className="mb-8">
            <Text className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              Confirm Password
            </Text>

            <View className="relative border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl">
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Re-enter new password"
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                className="px-4 pr-12 py-3 text-gray-900 dark:text-white"
                placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm((s) => !s)}
                accessibilityRole="button"
                accessibilityLabel={showConfirm ? "Hide confirm password" : "Show confirm password"}
                className="absolute right-3 top-0 bottom-0 justify-center items-center"
              >
                <Ionicons name={showConfirm ? "eye-off" : "eye"} size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            disabled={saving}
            onPress={handleSave}
            activeOpacity={0.9}
            className="bg-green-600 py-3 rounded-xl"
          >
            <Text className="text-center text-white font-semibold text-lg">
              {saving ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
