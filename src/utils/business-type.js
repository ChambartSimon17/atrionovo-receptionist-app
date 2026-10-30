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
  "opening-hours",
  "special-opening-days",
];

/**
 * Whether a business type may open the screen with the
 * given expo-router segments (for example ["settings",
 * "opening-hours"]).
 *
 * - Restaurants may open everything except /massage/...
 * - Massage businesses may only open /massage/..., the
 *   shared settings screens and the login screen.
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

    if (first === "massage" || first === "login") {
      return true;
    }

    return (
      first === "settings" &&
      SHARED_SETTINGS_SCREENS.includes(segments[1])
    );
  }

  return first !== "massage";
}
