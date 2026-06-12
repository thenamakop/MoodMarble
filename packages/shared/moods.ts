export const MOODS = [
  "energised",
  "happy",
  "calm",
  "focused",
  "neutral",
  "tired",
  "stressed",
  "sad",
  "unheard",
] as const;

export type MoodValue = (typeof MOODS)[number];

export const TAGS = [
  "#meetings",
  "#workload",
  "#management",
  "#team",
  "#deadlines",
  "#recognition",
] as const;

export type TagValue = (typeof TAGS)[number];

export const MOOD_LABELS: Record<MoodValue, string> = {
  energised: "Energised",
  happy: "Happy",
  calm: "Calm",
  focused: "Focused",
  neutral: "Neutral",
  tired: "Tired",
  stressed: "Stressed",
  sad: "Sad",
  unheard: "Unheard",
};

export const MOOD_COLORS: Record<MoodValue, string> = {
  energised: "#22C55E",
  happy: "#38BDF8",
  calm: "#A78BFA",
  focused: "#FBBF24",
  neutral: "#9CA3AF",
  tired: "#FB923C",
  stressed: "#F87171",
  sad: "#60A5FA",
  unheard: "#4B5563",
};