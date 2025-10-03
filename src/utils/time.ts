export function timeAgo(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diffMs < minute) {
    const m = Math.max(1, Math.round(diffMs / 1000));
    return m === 1 ? "1 second ago" : `${m} seconds ago`;
  }
  if (diffMs < hour) {
    const m = Math.round(diffMs / minute);
    return m === 1 ? "1 minute ago" : `${m} minutes ago`;
  }
  if (diffMs < day) {
    const h = Math.round(diffMs / hour);
    return h === 1 ? "1 hour ago" : `${h} hours ago`;
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - day);
  if (d >= startOfYesterday && d < startOfToday) return "yesterday";

  if (diffMs < week) {
    return d.toLocaleDateString(undefined, { weekday: "long" });
  }

  const w = Math.round(diffMs / week);
  return w === 1 ? "1 week ago" : `${w} weeks ago`;
}
