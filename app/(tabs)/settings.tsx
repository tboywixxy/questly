import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Switch, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../src/services/supabase";

export default function SettingsScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  function confirmLogout() {
    Alert.alert(
      "Log out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert("Logout failed", error.message);
              return;
            }
            router.replace("/(auth)/login"); // prevent back navigation
          },
        },
      ],
      { cancelable: true }
    );
  }

  return (
    <View className="flex-1 bg-gray-100 dark:bg-gray-900 px-6 py-8">
      <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Settings
      </Text>

      {/* Profile */}
      <TouchableOpacity
        onPress={() => router.push("/profile")}
        className="flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl mb-4"
        activeOpacity={0.8}
      >
        <Text className="text-lg text-gray-900 dark:text-white">Profile</Text>
      </TouchableOpacity>

      {/* Notifications */}
      <View className="flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl mb-4">
        <Text className="text-lg text-gray-900 dark:text-white">Notifications</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          thumbColor={notificationsEnabled ? "#22c55e" : "#f4f3f4"}
          trackColor={{ false: "#767577", true: "#86efac" }}
        />
      </View>

      {/* Passwords */}
      <TouchableOpacity
        onPress={() => router.push("/password")}
        className="flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl mb-4"
        activeOpacity={0.8}
      >
        <Text className="text-lg text-gray-900 dark:text-white">Passwords</Text>
      </TouchableOpacity>

      {/* Logout (row style, red text) */}
      <TouchableOpacity
        onPress={confirmLogout}
        className="flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl"
        activeOpacity={0.8}
      >
        <Text className="text-lg font-semibold text-red-600">Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
