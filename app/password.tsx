import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../src/services/supabase";

export default function PasswordScreen() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

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
      router.back(); // back to Settings
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-gray-100 dark:bg-gray-900 px-6">
      {/* Center everything vertically */}
      <View className="flex-1 justify-center">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          Change Password
        </Text>

        {/* New Password */}
        <View className="mb-6">
          <Text className="text-xs uppercase tracking-wider text-gray-500 mb-2">
            New Password
          </Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            secureTextEntry
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
          />
          <Text className="text-xs text-gray-500 mt-2">
            Tip: mix uppercase, lowercase, numbers, and symbols.
          </Text>
        </View>

        {/* Confirm Password */}
        <View className="mb-10">
          <Text className="text-xs uppercase tracking-wider text-gray-500 mb-2">
            Confirm Password
          </Text>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Re-enter new password"
            secureTextEntry
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
          />
        </View>

        <TouchableOpacity
          disabled={saving}
          onPress={handleSave}
          className="bg-green-600 py-3 rounded-xl"
          activeOpacity={0.9}
        >
          <Text className="text-center text-white font-semibold text-lg">
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
