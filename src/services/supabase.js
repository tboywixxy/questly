// src/services/supabase.ts
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Only require on native so web/SSR doesn't load SecureStore at all
const SecureStore: null | {
  getItemAsync: (k: string) => Promise<string | null>;
  setItemAsync: (k: string, v: string) => Promise<void>;
  deleteItemAsync: (k: string) => Promise<void>;
} = Platform.OS === "web" ? null : require("expo-secure-store");

// Web storage
const localStorageAdapter = {
  getItem: async (key: string) =>
    typeof window !== "undefined" ? window.localStorage.getItem(key) : null,
  setItem: async (key: string, value: string) => {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  },
};

// Native: prefer SecureStore, else AsyncStorage
const secureStoreAdapter =
  SecureStore && typeof SecureStore.getItemAsync === "function"
    ? {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      }
    : null;

const asyncStorageAdapter = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

const storage =
  Platform.OS === "web" ? localStorageAdapter : secureStoreAdapter ?? asyncStorageAdapter;

/** 🔐 Direct constants (as requested) */
const SUPABASE_URL = "https://sgrpmhnqpnxyjwbfmydh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncnBtaG5xcG54eWp3YmZteWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjkyNTYsImV4cCI6MjA3NDgwNTI1Nn0.75BTFR7EANn3_gB6XgbcROh9TqRNe4bE0dagzfh4O4c";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // required for native + expo-router
  },
});
