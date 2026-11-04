import { Appearance, DevSettings } from "react-native";
import * as SecureStore from "expo-secure-store";

// ======================================================
// Appearance
// ======================================================
//
// Licht, donker or automatisch (follow the phone). The
// choice is stored on the phone and applied before the
// theme picks its palette (theme/index.js imports this
// file first). The styles of the app are created once,
// so a different choice reloads the app.
// ======================================================

const KEY = "appearance";

export const APPEARANCES = ["automatic", "light", "dark"];

export function getAppearance() {
  try {
    const stored = SecureStore.getItem(KEY);

    return APPEARANCES.includes(stored) ? stored : "automatic";
  } catch {
    return "automatic";
  }
}

function apply(appearance) {
  // "unspecified" hands the choice back to the phone.
  Appearance.setColorScheme?.(
    appearance === "automatic" ? "unspecified" : appearance
  );
}

apply(getAppearance());

export function setAppearance(appearance) {
  try {
    SecureStore.setItem(KEY, appearance);
  } catch {
    // Not stored: it still applies until the app closes.
  }

  apply(appearance);
  DevSettings.reload();
}

/**
 * Reloads when the phone switches between light and dark
 * while the app follows the phone.
 */
export function watchSystemAppearance(currentlyDark) {
  const subscription = Appearance.addChangeListener(({ colorScheme }) => {
    if (
      getAppearance() === "automatic" &&
      (colorScheme === "dark") !== currentlyDark
    ) {
      DevSettings.reload();
    }
  });

  return () => subscription.remove();
}
