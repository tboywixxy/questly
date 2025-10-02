import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const supabaseUrl = "https://sgrpmhnqpnxyjwbfmydh.supabase.co";  // paste from step 2
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncnBtaG5xcG54eWp3YmZteWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjkyNTYsImV4cCI6MjA3NDgwNTI1Nn0.75BTFR7EANn3_gB6XgbcROh9TqRNe4bE0dagzfh4O4c";                // paste from step 2

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
