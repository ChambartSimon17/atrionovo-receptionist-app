import { useWindowDimensions } from "react-native";

// ======================================================
// Wide layout
// ======================================================
//
// True on a tablet held in landscape (an iPad, or a wide
// split view on one). Screens then show two panes side by
// side instead of one narrow column; on a phone and on a
// tablet in portrait nothing changes.
// ======================================================

const MIN_WIDTH = 960;

export default function useWideLayout() {
  const { width, height } = useWindowDimensions();

  return width >= MIN_WIDTH && width > height;
}
