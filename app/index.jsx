import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../src/services/supabase";

export default function Index() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(null); 

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ data: { session } = {} }, done] = await Promise.all([
          supabase.auth.getSession(),
          AsyncStorage.getItem("@onboarding_done"),
        ]);

        if (!alive) return;

        const isLogged = !!session;
        setLoggedIn(isLogged);

        if (isLogged) {
          await AsyncStorage.setItem("@onboarding_done", "1");
          setOnboardingDone(true);
        } else {
          setOnboardingDone(done === "1");
        }
      } catch (e) {
        setOnboardingDone(true);
      } finally {
        if (alive) setReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (!ready || onboardingDone === null) return null;

  if (loggedIn) return <Redirect href="/(tabs)/home" />;

  if (!onboardingDone) return <Redirect href="/(auth)/onboarding" />;

  return <Redirect href="/(auth)/login" />;
}
