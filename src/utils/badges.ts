// src/utils/badges.ts
export type Badge = { label: string; colorClass: string | null };

export function getBadge(totalLikes: number | null | undefined): Badge | null {
  const n = totalLikes ?? 0;
  if (n >= 100) return { label: "100+", colorClass: "bg-purple-600" };
  if (n >= 50)  return { label: "50",  colorClass: "bg-blue-600" };
  if (n >= 10)  return { label: "10",  colorClass: "bg-yellow-500" };
  return null; // < 10 → no badge
}
