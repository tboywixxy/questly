// app/index.tsx
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../src/services/supabase";

export default function Index() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;
      setLoggedIn(!!session);
      setReady(true);
    })();
    return () => { alive = false; };
  }, []);

  if (!ready) return null;

  return <Redirect href={loggedIn ? "/(tabs)/home" : "/(auth)/login"} />;
}
