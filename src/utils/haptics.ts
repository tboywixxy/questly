// src/utils/haptics.ts
import * as Haptics from "expo-haptics";

/** very subtle tap */
export async function tinyTap() {
  try {
    await Haptics.selectionAsync();
  } catch {}
}

/** a slightly stronger tick (optional) */
export async function lightImpact() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}
