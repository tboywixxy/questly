import { useState } from "react";
import { View, TextInput, Alert, Text, TouchableOpacity } from "react-native";
import { supabase } from "../../src/services/supabase";
import { Link, useRouter } from "expo-router";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      Alert.alert("Login failed", error.message);
      return;
    }
    router.replace("/(tabs)/home");
  }

  return (
    <View className="flex-1 justify-center px-6 bg-gray-100 dark:bg-gray-900">
      <Text className="text-4xl font-bold text-center mb-10 text-gray-900 dark:text-white">
        Questly
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

      <Text className="mb-2 text-gray-700 dark:text-gray-300">Password</Text>
      <TextInput
        placeholder="Enter password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 mb-6 text-gray-900 dark:text-white"
      />

      <TouchableOpacity
        onPress={handleLogin}
        className="bg-blue-600 rounded-xl py-3 mb-6"
      >
        <Text className="text-center text-white font-semibold text-lg">Login</Text>
      </TouchableOpacity>

      <Text className="text-center text-gray-700 dark:text-gray-300">
        Don’t have an account?{" "}
        <Link href="/(auth)/register" className="text-blue-600 font-semibold">
          Register
        </Link>
      </Text>
    </View>
  );
}
