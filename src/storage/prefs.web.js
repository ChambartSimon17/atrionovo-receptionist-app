// Small settings (language, appearance) in the browser.
export function getPref(key) {
  return globalThis.localStorage?.getItem(key) ?? null;
}

export function setPref(key, value) {
  globalThis.localStorage?.setItem(key, value);
}
