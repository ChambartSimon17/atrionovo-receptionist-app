import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors, radius, spacing } from "../../theme";

// ======================================================
// Skeleton
// ======================================================
//
// Grey shapes that pulse while a screen loads, in the
// layout the content will have, instead of a spinner.
//
// Skeleton          one block
// SkeletonList      a stack of row cards
// SkeletonTiles     a 2 × 2 grid of stat tiles
// ======================================================

export function Skeleton({ width = "100%", height = 14, style, round }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.45, { duration: 750 }), -1, true);
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius: round ? height / 2 : radius.sm },
        animated,
        style,
      ]}
    />
  );
}

export function SkeletonList({ rows = 5, style }) {
  return (
    <View style={[styles.list, style]}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.row}>
          <Skeleton width={44} height={44} round />
          <View style={styles.rowText}>
            <Skeleton width="55%" height={14} />
            <Skeleton width="35%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function SkeletonTiles({ style }) {
  return (
    <View style={[styles.tiles, style]}>
      {Array.from({ length: 4 }, (_, index) => (
        <View key={index} style={styles.tile}>
          <Skeleton width="50%" height={11} />
          <Skeleton width="35%" height={26} />
          <Skeleton width="60%" height={11} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.skeleton,
  },

  list: {
    gap: spacing.sm,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  rowText: {
    flex: 1,
    gap: spacing.sm,
  },

  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },

  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
