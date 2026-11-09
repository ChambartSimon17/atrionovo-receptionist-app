import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ChartColumn,
  ChevronRight,
  LogOut,
  PhoneCall,
} from "lucide-react-native";

import { useAuth } from "../context/auth-context";
import { api } from "../services/api";
import { Button, Card } from "./ui";
import { t } from "../i18n";
import { colors, fonts, radius, spacing, type } from "../theme";
import { unregisterPushNotifications } from "../services/notifications";
import useWideLayout from "../hooks/useWideLayout";
import { EmbeddedContext } from "./embedded";
import { morePages } from "./more-pages";

// ======================================================
// Meer
// ======================================================
//
// Everything that is not a daily screen, the same for
// restaurants and salons:
//
//   the business card
//   Analyse (green card)
//   AI-receptionist: the call log, with the number of
//   callers still to call back
//   Instellingen: the links the business type passes in
//   Uitloggen
//
// On a tablet in landscape Meer works like the iPad
// Settings app: the list stays on the left and the chosen
// page opens on the right (see more-pages.js). Pages that
// need the whole screen still open on their own.
// ======================================================

function LinkRow({ link, first, selected, onPress }) {
  const Icon = link.icon;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !first && styles.rowDivider,
        selected && styles.rowSelected,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.rowIcon}>
        <Icon size={18} color={colors.primary} strokeWidth={1.8} />
      </View>
      <View style={styles.rowText}>
        <Text style={type.bodyMedium}>{link.title}</Text>
        {link.subtitle ? <Text style={type.caption}>{link.subtitle}</Text> : null}
      </View>
      {link.badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{link.badge}</Text>
        </View>
      ) : null}
      <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.8} />
    </Pressable>
  );
}

export default function MoreScreen({ settingsLinks, analyticsHref, analyticsSubtitle }) {
  const router = useRouter();
  const wide = useWideLayout();
  const { user, business, accessToken, logout } = useAuth();

  const [openHref, setOpenHref] = useState("/calls");
  const [openCallbacks, setOpenCallbacks] = useState(0);
  const [callsToday, setCallsToday] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (!business?.id) {
        return;
      }

      const from = new Date();
      from.setHours(0, 0, 0, 0);

      api
        .getAiStats(
          business.id,
          { from: from.toISOString(), to: new Date(Date.now() + 60000).toISOString() },
          accessToken
        )
        .then((response) => {
          const stats = response?.data ?? response;
          setCallsToday(stats?.callCount ?? 0);
        })
        .catch(() => {});

      const weekAgo = new Date(Date.now() - 7 * 86400000);

      api
        .getAiStats(
          business.id,
          { from: weekAgo.toISOString(), to: new Date(Date.now() + 60000).toISOString() },
          accessToken
        )
        .then((response) => setOpenCallbacks((response?.data ?? response)?.openCallbacks ?? 0))
        .catch(() => {});
    }, [accessToken, business?.id])
  );

  const aiLinks = [
    {
      href: "/calls",
      icon: PhoneCall,
      title: t("more.calls"),
      subtitle:
        callsToday === null
          ? t("more.callsSubtitle")
          : t("more.callsToday", { count: callsToday }),
      badge: openCallbacks > 0 ? t("more.callBackBadge", { count: openCallbacks }) : null,
    },
  ];

  // Next to the list on a tablet, on its own screen on a phone.
  function open(href) {
    if (wide && morePages[href]) {
      setOpenHref(href);
    } else {
      router.push(href);
    }
  }

  const OpenPage = wide ? morePages[openHref] : null;

  const profile = (
    <Card style={styles.profile}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(business?.name?.[0] ?? "A").toUpperCase()}
        </Text>
      </View>
      <View style={styles.profileText}>
        <Text style={type.bodyMedium}>{business?.name}</Text>
        <Text style={type.caption} numberOfLines={1}>
          {[user?.firstName, user?.lastName].filter(Boolean).join(" ")}
          {user?.email ? ` · ${user.email}` : ""}
        </Text>
      </View>
    </Card>
  );

  const analytics = (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(analyticsHref)}
      style={({ pressed }) => [styles.analytics, pressed && styles.analyticsPressed]}
    >
      <View style={styles.analyticsIcon}>
        <ChartColumn size={20} color={colors.onPrimary} strokeWidth={1.8} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.analyticsTitle}>{t("more.analytics")}</Text>
        <Text style={styles.analyticsSubtitle}>{analyticsSubtitle}</Text>
      </View>
      <ChevronRight size={18} color={colors.onPrimaryMuted} strokeWidth={1.8} />
    </Pressable>
  );

  const ai = (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{t("more.ai")}</Text>
      <Card style={styles.list}>
        {aiLinks.map((link, index) => (
          <LinkRow
            key={link.href}
            link={link}
            first={index === 0}
            selected={wide && link.href === openHref}
            onPress={() => open(link.href)}
          />
        ))}
      </Card>
    </View>
  );

  const settings = (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{t("more.settings")}</Text>
      <Card style={styles.list}>
        {settingsLinks.map((link, index) => (
          <LinkRow
            key={link.href}
            link={link}
            first={index === 0}
            selected={wide && link.href === openHref}
            onPress={() => open(link.href)}
          />
        ))}
      </Card>
    </View>
  );

  const logoutButton = (
    <Button
      label={t("more.logout")}
      variant="danger"
      icon={<LogOut size={18} color={colors.danger} strokeWidth={1.8} />}
      onPress={async () => {
        await unregisterPushNotifications(accessToken);
        await logout();
        router.replace("/login");
      }}
    />
  );

  if (wide) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.split}>
          <ScrollView style={styles.sidebar} contentContainerStyle={styles.sidebarContent}>
            <Text style={type.title}>{t("tabs.more")}</Text>
            {profile}
            {analytics}
            {ai}
            {settings}
            {logoutButton}
          </ScrollView>

          <View style={styles.page}>
            <EmbeddedContext.Provider value={true}>
              {OpenPage ? <OpenPage key={openHref} /> : null}
            </EmbeddedContext.Provider>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={type.title}>{t("tabs.more")}</Text>
        {profile}
        {analytics}
        {ai}
        {settings}
        {logoutButton}
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

  // Tablet in landscape: the list left, the page right

  split: {
    flex: 1,
    flexDirection: "row",
  },

  sidebar: {
    width: 400,
    flexGrow: 0,
  },

  sidebarContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },

  page: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    backgroundColor: colors.background,
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
    backgroundColor: "rgba(255, 255, 255, 0.14)",
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

  rowSelected: {
    backgroundColor: colors.primarySoft,
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

  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerSoft,
  },

  badgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.danger,
  },
});
