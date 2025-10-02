import { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { supabase } from "../../src/services/supabase";
import { useRouter } from "expo-router";

export default function OtpScreen() {
  const [email, setEmail] = useState(""); // user enters their email
  const [token, setToken] = useState(""); // OTP code
  const router = useRouter();

  async function handleVerifyOtp() {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup", // can also be "magiclink", "recovery", "invite"
    });

    if (error) {
      Alert.alert("Verification failed", error.message);
      return;
    }

    Alert.alert("Success", "Your email has been verified!");
    router.replace("/(tabs)/home"); // go to home after OTP success
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text>Email</Text>
      <TextInput
        placeholder="anth@gmail.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, marginBottom: 15, padding: 10, borderRadius: 5 }}
      />

      <Text>Enter OTP</Text>
      <TextInput
        placeholder="6-digit code"
        value={token}
        onChangeText={setToken}
        keyboardType="numeric"
        style={{ borderWidth: 1, marginBottom: 20, padding: 10, borderRadius: 5 }}
      />

      <Button title="Verify OTP" onPress={handleVerifyOtp} />
    </View>
  );
}
