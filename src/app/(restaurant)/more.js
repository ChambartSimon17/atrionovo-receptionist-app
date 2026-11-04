import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  CalendarClock,
  ChartColumn,
  ChevronRight,
  Clock,
  LayoutGrid,
  LogOut,
  Store,
} from "lucide-react-native";

import { useAuth } from "../../context/auth-context";
import { Button, Card } from "../../components/ui";
import {
  colors,
  fonts,
  radius,
  spacing,
  type,
} from "../../theme";

// ======================================================
// Meer
// ======================================================
//
// Everything that is not a daily screen: the analysis,
// the restaurant settings (details, floor plan, opening
// hours) and logging out.
// ======================================================

const SETTINGS_LINKS = [
  {
    href: "/settings/business",
    icon: Store,
    title: "Restaurantgegevens",
    subtitle: "Naam, capaciteit, tijdzone en taal",
  },
  {
    href: "/floor",
    icon: LayoutGrid,
    title: "Vloerplan en tafels",
    subtitle: "Tafels, plaatsen en hun plek in de zaal",
  },
  {
    href: "/settings/opening-hours",
    icon: Clock,
    title: "Openingsuren",
    subtitle: "Middag- en avondservice per dag",
  },
  {
    href: "/settings/special-opening-days",
    icon: CalendarClock,
    title: "Speciale openingsdagen",
    subtitle: "Feestdagen en uitzonderingen",
  },
];

export default function RestaurantMoreScreen() {
  const router = useRouter();

  const { user, business, logout } = useAuth();

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={type.title}>Meer</Text>

        <Card style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(business?.name?.[0] ?? "A").toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileText}>
            <Text style={type.bodyMedium}>
              {business?.name || "Je restaurant"}
            </Text>
            <Text style={type.caption}>
              {[user?.firstName, user?.lastName]
                .filter(Boolean)
                .join(" ")}
              {user?.email ? ` · ${user.email}` : ""}
            </Text>
          </View>
        </Card>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/analytics")}
          style={({ pressed }) => [
            styles.analytics,
            pressed && styles.analyticsPressed,
          ]}
        >
          <View style={styles.analyticsIcon}>
            <ChartColumn
              size={20}
              color={colors.onPrimary}
              strokeWidth={1.8}
            />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.analyticsTitle}>Analyse</Text>
            <Text style={styles.analyticsSubtitle}>
              Couverts, no-shows, vaste gasten
            </Text>
          </View>
          <ChevronRight
            size={18}
            color={colors.onPrimaryMuted}
            strokeWidth={1.8}
          />
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Instellingen
          </Text>

          <Card style={styles.list}>
            {SETTINGS_LINKS.map((link, index) => {
              const Icon = link.icon;

              return (
                <Pressable
                  key={link.href}
                  accessibilityRole="button"
                  onPress={() => router.push(link.href)}
                  style={({ pressed }) => [
                    styles.row,
                    index > 0 && styles.rowDivider,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View style={styles.rowIcon}>
                    <Icon
                      size={18}
                      color={colors.primary}
                      strokeWidth={1.8}
                    />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={type.bodyMedium}>
                      {link.title}
                    </Text>
                    <Text style={type.caption}>
                      {link.subtitle}
                    </Text>
                  </View>
                  <ChevronRight
                    size={18}
                    color={colors.textMuted}
                    strokeWidth={1.8}
                  />
                </Pressable>
              );
            })}
          </Card>
        </View>

        <Button
          label="Uitloggen"
          variant="danger"
          icon={
            <LogOut
              size={18}
              color={colors.danger}
              strokeWidth={1.8}
            />
          }
          onPress={async () => {
            await logout();
            router.replace("/login");
          }}
        />
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
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },

  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.onPrimary,
  },

  profileText: {
    flex: 1,
    gap: 2,
  },

  analytics: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },

  analyticsPressed: {
    backgroundColor: colors.primaryPressed,
  },

  analyticsIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: "#2C7466",
    alignItems: "center",
    justifyContent: "center",
  },

  analyticsTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.onPrimary,
  },

  analyticsSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.onPrimaryMuted,
  },

  section: {
    gap: spacing.sm,
  },

  sectionLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  list: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    minHeight: 56,
  },

  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  rowText: {
    flex: 1,
    gap: 2,
  },
});
