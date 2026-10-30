// ======================================================
// Dates
// ======================================================
//
// Calendar days travel as "YYYY-MM-DD" strings. The days
// are those of the phone, which is the business's own
// timezone in practice.
// ======================================================

const WEEKDAYS = [
  "zondag",
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
];

const MONTHS = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

function pad(value) {
  return String(value).padStart(2, "0");
}

/**
 * Date -> "2026-11-02" (calendar day of the phone).
 */
export function toDateString(date) {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`;
}

/**
 * "2026-11-02" -> Date at local noon (safe around DST).
 */
function fromDateString(dateString) {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day, 12, 0, 0);
}

export function todayString() {
  return toDateString(new Date());
}

export function addDays(dateString, days) {
  const date = fromDateString(dateString);

  date.setDate(date.getDate() + days);

  return toDateString(date);
}

/**
 * "2026-11-02" -> "maandag 2 november"
 */
export function formatLongDate(dateString) {
  const date = fromDateString(dateString);

  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${
    MONTHS[date.getMonth()]
  }`;
}

/**
 * ISO instant -> "09:30" (time of the phone).
 */
export function formatTime(isoString) {
  const date = new Date(isoString);

  return `${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}
