import { useAuth } from "../context/auth-context";
import { BUSINESS_TYPES } from "../utils/business-type";

import { colors, fonts } from "./index";

// ======================================================
// Skin
// ======================================================
//
// Older screens were written with neutral greys, blacks
// and blues. Their style definitions are run through skin,
// which swaps those for the Eucalyptus colours and the
// font weights for Inter, so they match the newer screens
// without rewriting every style. A screen can add
// overrides for anything the mapping does not cover.
//
//   const styles = StyleSheet.create(
//     skin(styleDefs, { ...overrides })
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
  "#f0f0f0": colors.surfaceMuted,
  "#eef5ff": colors.primarySoft,
  "#f4f4f4": colors.surfaceMuted,
  "#dcefdc": colors.primarySoft,
  "#f0dddd": colors.dangerSoft,
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
  "#d32f2f": colors.danger,
  "#2e7d32": colors.primary,
  "#b3261e": colors.danger,
};

const BORDERS = {
  "#ccc": colors.border,
  "#ddd": colors.border,
  "#e1e1e1": colors.border,
  "#eee": colors.divider,
  "#e2e2e2": colors.border,
  "#111": colors.primary,
  "#087fe5": colors.primary,
  "#f0cccc": colors.dangerSoft,
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

export function skin(styleDefs, overrides = {}) {
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
 * Whether the logged-in business is a massage business.
 */
export function useIsMassage() {
  const { businessType } = useAuth();

  return businessType === BUSINESS_TYPES.MASSAGE;
}
