import { DevSettings } from "react-native";
import * as SecureStore from "expo-secure-store";

import nl from "./nl";
import fr from "./fr";
import en from "./en";

// ======================================================
// Translations
// ======================================================
//
// t("login.title") returns the text in the app language:
// Nederlands, Français or English. Dutch is the source;
// a key missing in French or English falls back to it.
//
// {name} placeholders are filled from the second
// argument: t("calls.callBack", { name: "Lisa" }).
//
// The language is chosen in Instellingen and stored on
// the phone; without a choice the app is in Dutch.
// Changing it reloads the app.
// ======================================================

const KEY = "app-language";

const DICTIONARIES = { nl, fr, en };

export const LANGUAGES = [
  { value: "nl", label: "NL" },
  { value: "fr", label: "FR" },
  { value: "en", label: "EN" },
];

function storedLanguage() {
  try {
    const stored = SecureStore.getItem(KEY);

    return DICTIONARIES[stored] ? stored : null;
  } catch {
    return null;
  }
}

export const language = storedLanguage() ?? "nl";

// The locale for dates and numbers.
export const locale = { nl: "nl-BE", fr: "fr-BE", en: "en-GB" }[language];

const dictionary = DICTIONARIES[language];

function lookup(source, key) {
  return key
    .split(".")
    .reduce((node, part) => (node == null ? node : node[part]), source);
}

export function t(key, values) {
  const text = lookup(dictionary, key) ?? lookup(nl, key) ?? key;

  if (!values || typeof text !== "string") {
    return text;
  }

  return text.replace(/\{(\w+)\}/g, (match, name) =>
    values[name] === undefined ? match : String(values[name])
  );
}

/**
 * "1 reservatie" or "3 reservaties": the key holds
 * { one, other }.
 */
export function plural(key, count, values = {}) {
  const forms = lookup(dictionary, key) ?? lookup(nl, key);
  const text = count === 1 ? forms?.one : forms?.other;

  return (text ?? key).replace(/\{(\w+)\}/g, (match, name) =>
    name === "count"
      ? String(count)
      : values[name] === undefined
        ? match
        : String(values[name])
  );
}

export function setLanguage(next) {
  if (!DICTIONARIES[next] || next === language) {
    return;
  }

  try {
    SecureStore.setItem(KEY, next);
  } catch {
    return;
  }

  DevSettings.reload();
}
