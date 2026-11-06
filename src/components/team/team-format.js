import { locale, t } from "../../i18n";
import { colors, isDark } from "../../theme";

// ======================================================
// Team: shared formatting
// ======================================================

function pad(value) {
  return String(value).padStart(2, "0");
}

export function formatMinutes(minutes) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/**
 * [{ startMinutes, endMinutes }] -> "10:00 – 18:00, 19:00 – 21:00"
 */
export function formatPeriods(periods) {
  return periods
    .map((period) => `${formatMinutes(period.startMinutes)} – ${formatMinutes(period.endMinutes)}`)
    .join(", ");
}

/**
 * Hours as on the week grid: "10" or "9:30".
 */
export function shortHour(minutes) {
  return minutes % 60 === 0 ? String(minutes / 60) : formatMinutes(minutes).replace(/^0/, "");
}

/**
 * 375 -> "6u 15m" (or "6h 15m").
 */
export function formatWorked(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const h = locale.startsWith("nl") ? "u" : "h";

  if (hours === 0) {
    return `${rest}m`;
  }

  return rest ? `${hours}${h} ${rest}m` : `${hours}${h}`;
}

export function fromKey(key) {
  const [year, month, day] = key.split("-").map(Number);

  return new Date(year, month - 1, day, 12);
}

export function toKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dayCount(startDate, endDate) {
  return Math.round((fromKey(endDate) - fromKey(startDate)) / 86400000) + 1;
}

/**
 * "ma 9 nov" or "ma 9 – di 10 nov".
 */
export function formatDateRange(startDate, endDate) {
  const options = { weekday: "short", day: "numeric", month: "short" };
  const start = fromKey(startDate).toLocaleDateString(locale, options);

  if (startDate === endDate) {
    return start;
  }

  return `${start} – ${fromKey(endDate).toLocaleDateString(locale, options)}`;
}

export function formatClock(iso) {
  const date = new Date(iso);

  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function reasonLabel(reason) {
  return t(`team.reasons.${reason}`);
}

// Colours of a day on the week grid.
export const dayColors = {
  work: { background: colors.primarySoft, text: colors.primary },
  custom: { background: colors.primarySoft, text: colors.primary, border: colors.primary },
  off: { background: "transparent", text: colors.textDisabled, border: colors.border },
  SICK: { background: colors.dangerSoft, text: colors.danger },
  LEAVE: { background: colors.sandSoft, text: colors.onSand },
  PERSONAL: { background: colors.infoSoft, text: colors.info },
  TRAINING: { background: colors.warningSoft, text: colors.warning },
};

// Avatar colours, one per therapist (by position).
const AVATARS = isDark
  ? [
      { background: "#1D332E", text: "#9CC3B5" },
      { background: "#3A2C12", text: "#F2CC85" },
      { background: "#16304A", text: "#A8CCF0" },
      { background: "#3A1F2C", text: "#F0A8C8" },
      { background: "#2A2A40", text: "#C0C0F0" },
    ]
  : [
      { background: "#E3EEEA", text: "#1F5F55" },
      { background: "#FAEEDA", text: "#633806" },
      { background: "#E6F1FB", text: "#0C447C" },
      { background: "#FBEAF0", text: "#72243E" },
      { background: "#EEEDFE", text: "#3C3489" },
    ];

export function avatarColors(index) {
  return AVATARS[index % AVATARS.length];
}

// Status chips on the attendance list.
export const attendanceColors = {
  PRESENT: { background: colors.primarySoft, text: colors.primary },
  DONE: { background: colors.surfaceMuted, text: colors.textMuted },
  LATE: { background: colors.warningSoft, text: colors.warning },
  NOT_ARRIVED: { background: colors.dangerSoft, text: colors.danger },
  FORGOT_CLOCK_OUT: { background: colors.dangerSoft, text: colors.danger },
  EXPECTED: { background: colors.infoSoft, text: colors.info },
  ABSENT: { background: colors.sandSoft, text: colors.onSand },
  OFF: { background: colors.surfaceMuted, text: colors.textMuted },
};
