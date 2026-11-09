import { StyleSheet, View } from "react-native";

import useWideLayout from "../../hooks/useWideLayout";
import { useEmbedded } from "../embedded";

// ======================================================
// Columns
// ======================================================
//
// Two columns on a tablet in landscape, one below the
// other everywhere else. On a phone the children render
// exactly as before, in the parent's own gap. A page
// embedded next to a list is too narrow for two columns
// and stacks too.
//
//   <Columns gap={16} left={...} right={...} />
//
// gap is the space between blocks inside a column (use 0
// when the blocks keep their own margins), columnGap the
// space between the two columns. leftFlex sets how wide
// the left column is next to the right one (1 = equal).
// ======================================================

export default function Columns({ left, right, gap = 16, columnGap = 32, leftFlex = 1, style }) {
  const wide = useWideLayout();
  const embedded = useEmbedded();

  if (!wide || embedded) {
    return (
      <>
        {left}
        {right}
      </>
    );
  }

  return (
    <View style={[styles.row, { gap: columnGap }, style]}>
      <View style={[styles.column, { flex: leftFlex, gap }]}>{left}</View>
      <View style={[styles.column, { gap }]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  column: {
    flex: 1,
    minWidth: 0,
  },
});
