import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CalendarSync } from "lucide-react-native";

import { Card } from "../../components/ui";
import { t } from "../../i18n";
import { colors, fonts, radius, spacing, type } from "../../theme";
import { useEmbedded } from "../../components/embedded";

// ======================================================
// Integraties (restaurant)
// ======================================================
//
// The booking platforms a restaurant may already use.
// None is connected yet: the first connection (most
// likely Zenchef) is built together with the first
// restaurant that works with it. AtrioNovo will then read
// the platform's diary and write its own changes back.
// ======================================================

const PLATFORMS = [
  { key: "zenchef", name: "Zenchef" },
  { key: "thefork", name: "TheFork" },
  { key: "resengo", name: "Resengo" },
  { key: "formitable", name: "Formitable" },
  { key: "opentable", name: "OpenTable" },
];

export default function PlatformsScreen() {
  const embedded = useEmbedded();

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <ScrollView contentContainerStyle={[styles.content, embedded && styles.fill]}>
        <Text style={type.title}>{t("platforms.title")}</Text>
        <Text style={type.body}>{t("platforms.intro")}</Text>

        <Card style={styles.card}>
          {PLATFORMS.map((platform, index) => (
            <View
              key={platform.key}
              style={[styles.row, index > 0 && styles.divider]}
            >
              <View style={styles.icon}>
                <CalendarSync size={20} color={colors.primary} strokeWidth={1.8} />
              </View>
              <View style={styles.flex}>
                <Text style={type.bodyMedium}>{platform.name}</Text>
                <Text style={type.caption}>{t(`platforms.${platform.key}`)}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t("platforms.soon")}</Text>
              </View>
            </View>
          ))}
        </Card>

        <Text style={type.caption}>{t("platforms.footer")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: 48,
    gap: spacing.md,
  },

  fill: {
    maxWidth: "100%",
  },

  card: {
    paddingVertical: spacing.xs,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },

  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  flex: {
    flex: 1,
  },

  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.surfaceMuted,
  },

  badgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.textMuted,
  },
});
