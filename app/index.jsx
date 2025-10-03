// app/index.js
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../src/services/supabase";

export default function Index() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let alive = true;

    async function bootstrap() {
      try {
        // initial session check
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        setLoggedIn(!!data?.session);
      } finally {
        if (alive) setReady(true);
      }
    }

    bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  if (!ready) return null;

  if (loggedIn) return <Redirect href="/(tabs)/home" />;

  return <Redirect href="/(auth)/onboarding" />;
}
