import * as SecureStore from "expo-secure-store";

// Small settings (language, appearance) that survive a restart.
export function getPref(key) {
  return SecureStore.getItem(key);
}

export function setPref(key, value) {
  SecureStore.setItem(key, value);
}
