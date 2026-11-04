import {
  CalendarCheck,
  CalendarSync,
  Info,
  PhoneMissed,
} from "lucide-react-native";

import { colors } from "../theme";

// ======================================================
// Call outcomes
// ======================================================
//
// The icon and colour of each outcome of an AI call,
// shared by the call log and the call screen.
// ======================================================

export const OUTCOMES = {
  NEEDS_CALLBACK: { icon: PhoneMissed, tone: "danger" },
  BOOKED: { icon: CalendarCheck, tone: "primary" },
  CHANGED: { icon: CalendarSync, tone: "info" },
  INFORMATION: { icon: Info, tone: "muted" },
};

export const OUTCOME_TONES = {
  danger: { background: colors.dangerSoft, color: colors.danger },
  primary: { background: colors.primarySoft, color: colors.primary },
  info: { background: colors.infoSoft, color: colors.info },
  muted: { background: colors.surfaceMuted, color: colors.textMuted },
};

export function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return minutes > 0 ? `${minutes}:${String(rest).padStart(2, "0")} min` : `${rest} s`;
}

