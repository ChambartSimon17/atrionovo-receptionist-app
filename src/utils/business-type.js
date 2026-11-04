// ======================================================
// Business types
// ======================================================
//
// A business is exactly one type. The type decides which
// dashboard the app shows after login and which screens
// the user may open.
//
// Older backends do not send a type; those are restaurants.
// ======================================================

export const BUSINESS_TYPES = {
  RESTAURANT: "RESTAURANT",
  MASSAGE: "MASSAGE",
};

export function normalizeBusinessType(type) {
  return type === BUSINESS_TYPES.MASSAGE
    ? BUSINESS_TYPES.MASSAGE
    : BUSINESS_TYPES.RESTAURANT;
}

/**
 * The first screen after login.
 */
export function getHomeRoute(type) {
  return normalizeBusinessType(type) ===
    BUSINESS_TYPES.MASSAGE
    ? "/massage/dashboard"
    : "/dashboard";
}

// Settings screens that work for every business type.
const SHARED_SETTINGS_SCREENS = [
  "business",
  "opening-hours",
  "special-opening-days",
];

// Top-level screens both business types use.
const SHARED_SCREENS = ["calls", "floor-plan"];

/**
 * Whether a business type may open the screen with the
 * given expo-router segments (for example ["settings",
 * "opening-hours"]).
 *
 * - Restaurants may open everything except /massage/...
 * - Massage businesses may only open /massage/..., the
 *   calendar, the call log, the floor plan editor, the
 *   shared settings screens and the login screen. The restaurant tabs sit in the "(restaurant)"
 *   group, which is not on that list.
 */
export function isRouteAllowed(type, segments) {
  const first = segments[0];

  if (
    normalizeBusinessType(type) ===
    BUSINESS_TYPES.MASSAGE
  ) {
    if (first === undefined) {
      return true;
    }

    if (
      first === "massage" ||
      first === "login" ||
      first === "calendar" ||
      SHARED_SCREENS.includes(first)
    ) {
      return true;
    }

    return (
      first === "settings" &&
      SHARED_SETTINGS_SCREENS.includes(segments[1])
    );
  }

  return first !== "massage";
}
