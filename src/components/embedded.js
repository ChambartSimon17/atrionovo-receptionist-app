import { createContext, useContext } from "react";

// ======================================================
// Embedded screens
// ======================================================
//
// On a tablet in landscape, Meer keeps its list on the
// left and opens a page next to it instead of on its own
// screen. A page shown there is "embedded": it has no
// back button, because there is nothing to go back to.
// ======================================================

export const EmbeddedContext = createContext(false);

export function useEmbedded() {
  return useContext(EmbeddedContext);
}
