import { useState } from "react";
import { View, TextInput, Alert, Text, TouchableOpacity } from "react-native";
import { supabase } from "../../src/services/supabase";
import { Link, useRouter } from "expo-router";

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();

  async function handleRegister() {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert("Registration failed", error.message);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      await supabase.from("profiles").insert([{ id: userId, username, email }]);
    }

    router.replace("/(tabs)/home");
  }

  return (
    <View className="flex-1 justify-center px-6 bg-gray-100 dark:bg-gray-900">
      <Text className="text-4xl font-bold text-center mb-10 text-gray-900 dark:text-white">
        Create Account
      </Text>

      <Text className="mb-2 text-gray-700 dark:text-gray-300">Email</Text>
      <TextInput
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 mb-4 text-gray-900 dark:text-white"
      />

      <Text className="mb-2 text-gray-700 dark:text-gray-300">Username</Text>
      <TextInput
        placeholder="username123"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 mb-4 text-gray-900 dark:text-white"
      />

      <Text className="mb-2 text-gray-700 dark:text-gray-300">Password</Text>
      <TextInput
        placeholder="Enter password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 mb-2 text-gray-900 dark:text-white"
      />
      <Text className="text-xs text-gray-500 mb-4">
        Must include lowercase, uppercase, digits, and symbols.
      </Text>

      <Text className="mb-2 text-gray-700 dark:text-gray-300">Confirm Password</Text>
      <TextInput
        placeholder="Re-enter password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 mb-6 text-gray-900 dark:text-white"
      />

      <TouchableOpacity
        onPress={handleRegister}
        className="bg-green-600 rounded-xl py-3 mb-6"
      >
        <Text className="text-center text-white font-semibold text-lg">Register</Text>
      </TouchableOpacity>

      <Text className="text-center text-gray-700 dark:text-gray-300">
        Already have an account?{" "}
        <Link href="/(auth)/login" className="text-blue-600 font-semibold">
          Login
        </Link>
      </Text>
    </View>
  );
}
