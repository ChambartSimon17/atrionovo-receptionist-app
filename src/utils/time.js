// ======================================================
// Days and times
// ======================================================
//
// The backend stores times as minutes after midnight
// (09:30 -> 570). The screens show and edit "HH:MM".
// ======================================================

export const DAYS = [
  { key: "MONDAY", label: "Maandag" },
  { key: "TUESDAY", label: "Dinsdag" },
  { key: "WEDNESDAY", label: "Woensdag" },
  { key: "THURSDAY", label: "Donderdag" },
  { key: "FRIDAY", label: "Vrijdag" },
  { key: "SATURDAY", label: "Zaterdag" },
  { key: "SUNDAY", label: "Zondag" },
];

export function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    mins
  ).padStart(2, "0")}`;
}

export function timeToMinutes(time) {
  const [hours, minutes] = time
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

export function isValidTime(time) {
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return false;
  }

  const [hours, minutes] = time
    .split(":")
    .map(Number);

  return (
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  );
}

/**
 * Empty week: { MONDAY: [], TUESDAY: [], ... }
 */
export function createEmptyWeek() {
  return DAYS.reduce((week, day) => {
    week[day.key] = [];
    return week;
  }, {});
}

/**
 * Backend working hours -> editable week.
 * [{ dayOfWeek, startMinutes, endMinutes }]
 *   -> { MONDAY: [{ start: "09:00", end: "17:00" }], ... }
 */
export function workingHoursToWeek(workingHours) {
  const week = createEmptyWeek();

  for (const period of workingHours ?? []) {
    week[period.dayOfWeek]?.push({
      start: minutesToTime(period.startMinutes),
      end: minutesToTime(period.endMinutes),
    });
  }

  return week;
}

/**
 * Editable week -> backend working hours.
 * Returns { workingHours } when valid, or { error } with a
 * Dutch message the screen can show.
 */
export function weekToWorkingHours(week) {
  const workingHours = [];

  for (const day of DAYS) {
    const periods = [];

    for (const period of week[day.key]) {
      if (
        !isValidTime(period.start) ||
        !isValidTime(period.end)
      ) {
        return {
          error: `${day.label}: gebruik het formaat UU:MM, bijvoorbeeld 09:00.`,
        };
      }

      const startMinutes = timeToMinutes(period.start);
      const endMinutes = timeToMinutes(period.end);

      if (startMinutes >= endMinutes) {
        return {
          error: `${day.label}: de starttijd moet voor de eindtijd liggen.`,
        };
      }

      periods.push({
        dayOfWeek: day.key,
        startMinutes,
        endMinutes,
      });
    }

    periods.sort(
      (a, b) => a.startMinutes - b.startMinutes
    );

    for (let i = 1; i < periods.length; i++) {
      if (
        periods[i].startMinutes <
        periods[i - 1].endMinutes
      ) {
        return {
          error: `${day.label}: de werkperiodes overlappen.`,
        };
      }
    }

    workingHours.push(...periods);
  }

  return { workingHours };
}

/**
 * Short summary of a week for a list, for example
 * "ma, di, do". Returns null when there are no hours.
 */
export function summarizeWorkingDays(workingHours) {
  const SHORT = {
    MONDAY: "ma",
    TUESDAY: "di",
    WEDNESDAY: "wo",
    THURSDAY: "do",
    FRIDAY: "vr",
    SATURDAY: "za",
    SUNDAY: "zo",
  };

  const days = DAYS.filter((day) =>
    (workingHours ?? []).some(
      (period) => period.dayOfWeek === day.key
    )
  ).map((day) => SHORT[day.key]);

  return days.length > 0 ? days.join(", ") : null;
}
