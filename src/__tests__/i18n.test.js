import nl from "../i18n/nl";
import fr from "../i18n/fr";
import en from "../i18n/en";
import { plural, t } from "../i18n";

jest.mock("expo-secure-store", () => ({ getItem: () => "nl", setItem: () => {} }));

function keys(node, prefix = "") {
  return Object.entries(node).flatMap(([key, value]) =>
    value && typeof value === "object" && !("one" in value)
      ? keys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );
}

describe("translations", () => {
  const dutch = keys(nl);

  test.each([
    ["fr", fr],
    ["en", en],
  ])("%s has every Dutch text", (name, dictionary) => {
    expect(dutch.filter((key) => !keys(dictionary).includes(key))).toEqual([]);
  });

  test("fills placeholders and plurals", () => {
    expect(t("floor.live", { time: "19:00" })).toBe("Live · 19:00");
    expect(plural("special.days", 1)).toBe("1 dag");
    expect(plural("special.days", 8)).toBe("8 dagen");
  });

  test("an unknown key shows the key", () => {
    expect(t("does.not.exist")).toBe("does.not.exist");
  });
});
