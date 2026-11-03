import { useAuth } from "../context/auth-context";
import { BUSINESS_TYPES } from "../utils/business-type";

import { colors, fonts } from "./index";

// ======================================================
// Massage skin
// ======================================================
//
// Some screens are shared by restaurants and massage
// businesses (opening hours, special opening days, the
// month calendar). Restaurants keep their own look; for a
// massage business the same style definitions are run
// through massageSkin, which swaps the neutral greys and
// blacks for the Eucalyptus colours and the font weights
// for Inter. A screen can add overrides for anything the
// mapping does not cover.
//
//   const restaurantStyles = StyleSheet.create(styleDefs);
//   const massageStyles = StyleSheet.create(
//     massageSkin(styleDefs, { ...overrides })
//   );
//   const styles = useBusinessStyles(
//     restaurantStyles,
//     massageStyles
//   );
// ======================================================

const BACKGROUNDS = {
  "#111": colors.primary,
  "#111111": colors.primary,
  "#000": colors.primary,
  "#087fe5": colors.primary,
  "#fff": colors.surface,
  "#ffffff": colors.surface,
  "#f7f7f7": colors.background,
  "#f5f5f5": colors.background,
  "#fafafa": colors.surface,
  "#eee": colors.surfaceMuted,
  "#eef5ff": colors.primarySoft,
};

const TEXT = {
  "#000": colors.text,
  "#111": colors.text,
  "#222": colors.text,
  "#333": colors.text,
  "#444": colors.text,
  "#555": colors.textMuted,
  "#666": colors.textMuted,
  "#777": colors.textMuted,
  "#888": colors.textMuted,
  "#999": colors.textDisabled,
  "#fff": colors.onPrimary,
  "#087fe5": colors.primary,
  "#0a58ca": colors.primary,
  "#c62828": colors.danger,
  "#b3261e": colors.danger,
};

const BORDERS = {
  "#ccc": colors.border,
  "#ddd": colors.border,
  "#e1e1e1": colors.border,
  "#eee": colors.divider,
  "#111": colors.primary,
};

const BORDER_KEYS = [
  "borderColor",
  "borderTopColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderRightColor",
];

function fontFor(weight) {
  if (weight === "700" || weight === "600" || weight === "bold") {
    return fonts.semibold;
  }

  return weight === "500" ? fonts.medium : fonts.regular;
}

function skinStyle(style) {
  const result = { ...style };

  const background = result.backgroundColor?.toLowerCase?.();
  if (background && BACKGROUNDS[background]) {
    result.backgroundColor = BACKGROUNDS[background];
  }

  const color = result.color?.toLowerCase?.();
  if (color && TEXT[color]) {
    result.color = TEXT[color];
  }

  BORDER_KEYS.forEach((key) => {
    const border = result[key]?.toLowerCase?.();

    if (border && BORDERS[border]) {
      result[key] = BORDERS[border];
    }
  });

  if (result.fontSize !== undefined || result.fontWeight !== undefined) {
    result.fontFamily = fontFor(result.fontWeight);
    delete result.fontWeight;
  }

  return result;
}

export function massageSkin(styleDefs, overrides = {}) {
  const skinned = {};

  Object.entries(styleDefs).forEach(([key, style]) => {
    skinned[key] = {
      ...skinStyle(style),
      ...overrides[key],
    };
  });

  Object.entries(overrides).forEach(([key, style]) => {
    if (!skinned[key]) {
      skinned[key] = style;
    }
  });

  return skinned;
}

/**
 * The styles for the logged-in business type.
 */
export function useBusinessStyles(restaurantStyles, massageStyles) {
  const { businessType } = useAuth();

  return businessType === BUSINESS_TYPES.MASSAGE
    ? massageStyles
    : restaurantStyles;
}

/**
 * Whether the logged-in business is a massage business.
 */
export function useIsMassage() {
  const { businessType } = useAuth();

  return businessType === BUSINESS_TYPES.MASSAGE;
}
