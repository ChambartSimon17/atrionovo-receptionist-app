import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { t } from "../../i18n";
import { colors, fonts, radius, spacing } from "../../theme";

// ======================================================
// ScreenHeader
// ======================================================
//
// The top of a pushed screen: a square back button, the
// title, and an optional element on the right (a "Klaar"
// text button, an icon).
// ======================================================

export default function ScreenHeader({ title, right, onBack }) {
  const router = useRouter();

  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.back")}
        hitSlop={8}
        onPress={onBack ?? (() => router.back())}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <ChevronLeft size={20} color={colors.text} strokeWidth={1.8} />
      </Pressable>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },

  back: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  pressed: {
    backgroundColor: colors.surfaceMuted,
  },

  title: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.text,
  },

  right: {
    minWidth: 40,
    alignItems: "flex-end",
  },
});
