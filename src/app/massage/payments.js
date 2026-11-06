import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { CreditCard } from "lucide-react-native";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";
import { Button, Card } from "../../components/ui";
import { t } from "../../i18n";
import { colors, fonts, radius, spacing, type } from "../../theme";

// ======================================================
// Betalingen (salon)
// ======================================================
//
// Connecting the business's own Stripe account, needed
// for QR payments at checkout. Stripe asks for the
// business and bank details on its own pages; the app
// opens them and checks the status when you come back.
// ======================================================

export default function PaymentsScreen() {
  const { business, accessToken } = useAuth();

  const [status, setStatus] = useState(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await api.getStripeStatus(business.id, accessToken);

      setStatus(response.data);
      setError(null);
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [business?.id, accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function connect() {
    setOpening(true);

    try {
      const response = await api.getStripeOnboardingLink(business.id, accessToken);

      await WebBrowser.openBrowserAsync(response.data.url);
      await load();
    } catch (connectError) {
      Alert.alert(t("common.error"), connectError.message);
    } finally {
      setOpening(false);
    }
  }

  const state = !status
    ? null
    : !status.configured
      ? "off"
      : status.chargesEnabled
        ? "ready"
        : status.connected
          ? "pending"
          : "none";

  const badge = {
    off: { label: t("payments.notConnected"), background: colors.surfaceMuted, text: colors.textMuted },
    none: { label: t("payments.notConnected"), background: colors.surfaceMuted, text: colors.textMuted },
    pending: { label: t("payments.pending"), background: colors.warningSoft, text: colors.warning },
    ready: { label: t("payments.connected"), background: colors.primarySoft, text: colors.primary },
  }[state];

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={type.title}>{t("payments.title")}</Text>
        <Text style={type.body}>{t("payments.intro")}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!status ? (
          <ActivityIndicator style={styles.loading} />
        ) : (
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.icon}>
                <CreditCard size={20} color={colors.primary} strokeWidth={1.8} />
              </View>
              <Text style={[type.bodyMedium, styles.flex]}>Stripe</Text>
              <View style={[styles.badge, { backgroundColor: badge.background }]}>
                <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
              </View>
            </View>

            <Text style={type.caption}>
              {state === "off"
                ? t("payments.notConfiguredHint")
                : state === "pending"
                  ? t("payments.pendingHint")
                  : state === "ready"
                    ? t("payments.readyHint")
                    : t("payments.subtitle")}
            </Text>

            {state === "none" || state === "pending" ? (
              <Button
                variant="primary"
                loading={opening}
                label={state === "pending" ? t("payments.continue") : t("payments.connect")}
                onPress={connect}
              />
            ) : null}

            {state === "pending" ? <Button label={t("payments.refresh")} onPress={load} /> : null}
          </Card>
        )}
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

  loading: {
    marginTop: spacing.xl,
  },

  error: {
    fontFamily: fonts.regular,
    color: colors.danger,
  },

  card: {
    gap: spacing.md,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
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
  },

  badgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
});
