// ======================================================
// Prices
// ======================================================
//
// The backend stores prices in cents (5500 = 55,00).
// ======================================================

/**
 * 5500 -> "€ 55,00"
 */
export function formatPrice(cents) {
  const amount = ((cents ?? 0) / 100)
    .toFixed(2)
    .replace(".", ",");

  return `€ ${amount}`;
}

/**
 * "55", "55,5" or "55.50" -> 5500 / 5550 / 5550.
 * Returns null when the text is not a valid price.
 */
export function parsePriceToCents(text) {
  const normalized = String(text ?? "")
    .trim()
    .replace(/^€\s*/, "")
    .replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  return Math.round(Number(normalized) * 100);
}

/**
 * 5500 -> "55,00" (for filling a text input)
 */
export function centsToInputText(cents) {
  return ((cents ?? 0) / 100)
    .toFixed(2)
    .replace(".", ",");
}

/**
 * 90 -> "1 u 30 min", 60 -> "1 u", 45 -> "45 min"
 */
export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${rest} min`;
  }

  return rest === 0
    ? `${hours} u`
    : `${hours} u ${rest} min`;
}
