import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { CreditCard, ExternalLink } from "lucide-react-native";

import { api } from "../../services/api";
import { useAuth } from "../../context/auth-context";
import {
  Button,
  ScreenHeader,
  SettingsGroup,
  SettingsRow,
  Skeleton,
} from "../../components/ui";
import { locale, t } from "../../i18n";
import { colors, fonts, radius, spacing } from "../../theme";
import { formatPrice } from "../../utils/price";
import { useEmbedded } from "../../components/embedded";

// ======================================================
// Abonnement
// ======================================================
//
// What the business pays AtrioNovo, read from
// GET /businesses/:id/billing:
//
//   plan       name, price, status (trial, failed payment)
//   this month call minutes and SMS against the plan, the
//              extra cost so far, when it starts again
//   manage     Stripe's customer portal (owner only): card,
//              invoices, change or cancel the plan
//   invoices   the last ones, each opens Stripe's page
//
// A month is a calendar month; extra use is invoiced early
// the next month (see the backend's billing module).
// ======================================================

const STATUS = {
  trialing: { key: "statusTrialing", tone: "info" },
  active: { key: "statusActive", tone: "positive" },
  past_due: { key: "statusPastDue", tone: "danger" },
  unpaid: { key: "statusUnpaid", tone: "danger" },
  incomplete: { key: "statusIncomplete", tone: "danger" },
  incomplete_expired: { key: "statusCanceled", tone: "muted" },
  canceled: { key: "statusCanceled", tone: "muted" },
};

function formatDate(value) {
  return new Date(value).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Brussels",
  });
}

function number(value) {
  return new Intl.NumberFormat(locale).format(value ?? 0);
}

function UsageMeter({ label, used, included, extra }) {
  const ratio = included > 0 ? Math.min(1, used / included) : 0;
  const tone = extra > 0 ? colors.danger : ratio > 0.8 ? colors.live : colors.primary;

  return (
    <View style={styles.meter}>
      <View style={styles.meterTop}>
        <Text style={styles.meterLabel}>{label}</Text>
        <Text style={styles.meterValue}>
          {included > 0
            ? t("subscription.usedOf", { used: number(used), included: number(included) })
            : number(used)}
          {extra > 0 ? (
            <Text style={styles.extra}>{`  ${t("subscription.extra", { count: number(extra) })}`}</Text>
          ) : null}
        </Text>
      </View>
      {included > 0 ? (
        <View style={styles.track}>
          <View style={[styles.fillBar, { width: `${Math.round(ratio * 100)}%`, backgroundColor: tone }]} />
        </View>
      ) : null}
    </View>
  );
}

export default function SubscriptionScreen() {
  const embedded = useEmbedded();
  const { accessToken, business, user } = useAuth();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [opening, setOpening] = useState(false);

  const isOwner = !user?.role || user.role === "OWNER";

  const load = useCallback(async () => {
    if (!business?.id || !accessToken) {
      return;
    }

    try {
      const response = await api.getBilling(business.id, accessToken);
      setData(response?.data ?? response);
      setError(null);
    } catch (loadError) {
      setError(loadError?.message || t("subscription.loadFailed"));
    }
  }, [accessToken, business?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function openPortal() {
    setOpening(true);

    try {
      const response = await api.getBillingPortalLink(business.id, accessToken);
      const url = (response?.data ?? response)?.url;

      if (url) {
        await WebBrowser.openBrowserAsync(url);
        await load();
      }
    } catch (portalError) {
      Alert.alert(t("common.error"), portalError?.message || t("common.tryAgain"));
    } finally {
      setOpening(false);
    }
  }

  const plan = data?.plan;
  const status = STATUS[data?.status];
  const usage = data?.usage;
  const problem = status?.tone === "danger";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={[styles.header, embedded && styles.fill]}>
        <ScreenHeader title={t("subscription.title")} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, embedded && styles.fill]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {error && !data ? <Text style={styles.error}>{error}</Text> : null}

        {/* Plan */}
        <View style={[styles.planCard, problem && styles.planCardProblem]}>
          {!data ? (
            <>
              <Skeleton width="40%" height={18} />
              <Skeleton width="60%" height={12} style={styles.gap} />
            </>
          ) : plan ? (
            <>
              <View style={styles.planTop}>
                <Text style={styles.planName}>AtrioNovo {plan.name}</Text>
                {status ? (
                  <View style={[styles.badge, styles[`badge_${status.tone}`]]}>
                    <Text style={[styles.badgeText, styles[`badgeText_${status.tone}`]]}>
                      {t(`subscription.${status.key}`, {
                        date: data.trialEndsAt ? formatDate(data.trialEndsAt) : "",
                      })}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.planPrice}>
                {formatPrice(plan.priceCents)}{" "}
                {plan.interval === "YEAR" ? t("subscription.perYear") : t("subscription.perMonth")}
                {" · "}
                {t("subscription.excl")}
              </Text>
              {data.cancelAtPeriodEnd ? (
                <Text style={styles.planNote}>{t("subscription.endsAtPeriodEnd")}</Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.planName}>{t("subscription.noPlan")}</Text>
              <Text style={styles.planNote}>{t("subscription.noPlanText")}</Text>
            </>
          )}
        </View>

        {/* This month */}
        <SettingsGroup
          label={t("subscription.thisMonth")}
          footer={data ? t("subscription.resetsOn", { date: formatDate(data.resetsAt) }) : null}
        >
          {usage ? (
            <View style={styles.meters}>
              <UsageMeter
                label={t("subscription.minutes")}
                used={usage.minutes}
                included={plan?.includedMinutes ?? 0}
                extra={usage.extraMinutes}
              />
              <UsageMeter
                label={t("subscription.sms")}
                used={usage.sms}
                included={plan?.includedSms ?? 0}
                extra={usage.extraSms}
              />
            </View>
          ) : (
            <View style={styles.meters}>
              <Skeleton width="100%" height={36} />
            </View>
          )}
          <SettingsRow label={t("subscription.calls")} value={usage ? number(usage.calls) : "–"} />
        </SettingsGroup>

        {plan ? (
          <SettingsGroup footer={t("subscription.extraCostFooter")}>
            <SettingsRow
              label={t("subscription.extraCost")}
              value={
                usage?.extraCents > 0
                  ? `${formatPrice(usage.extraCents)} ${t("subscription.excl")}`
                  : t("subscription.noExtra")
              }
            />
          </SettingsGroup>
        ) : null}

        {/* Manage in Stripe */}
        {data?.canManage ? (
          isOwner ? (
            <View style={styles.manage}>
              <Button
                label={t("subscription.manage")}
                variant={problem ? "primary" : "secondary"}
                loading={opening}
                icon={<CreditCard size={18} color={problem ? colors.onPrimary : colors.primary} strokeWidth={1.8} />}
                onPress={openPortal}
              />
              <Text style={[styles.footer, problem && styles.footerProblem]}>
                {problem ? t("subscription.pastDueFooter") : t("subscription.manageFooter")}
              </Text>
            </View>
          ) : (
            <Text style={styles.footer}>{t("subscription.ownerOnly")}</Text>
          )
        ) : null}

        {/* Invoices */}
        {data?.invoices?.length ? (
          <SettingsGroup label={t("subscription.invoices")} style={styles.invoices}>
            {data.invoices.map((invoice) => (
              <Pressable
                key={invoice.id}
                accessibilityRole={invoice.url ? "link" : undefined}
                disabled={!invoice.url}
                onPress={() => WebBrowser.openBrowserAsync(invoice.url)}
                style={({ pressed }) => [styles.invoice, pressed && styles.invoicePressed]}
              >
                <View style={styles.invoiceText}>
                  <Text style={styles.invoiceTitle}>
                    {invoice.kind === "OVERAGE" ? t("subscription.invoiceExtra") : t("subscription.invoicePlan")}
                    {invoice.number ? ` · ${invoice.number}` : ""}
                  </Text>
                  <Text style={styles.invoiceSub}>
                    {formatDate(invoice.issuedAt)}
                    {" · "}
                    <Text style={invoice.status === "paid" ? styles.paid : styles.open}>
                      {invoice.status === "paid" ? t("subscription.paid") : t("subscription.open")}
                    </Text>
                  </Text>
                </View>
                <Text style={styles.invoiceAmount}>{formatPrice(invoice.totalCents)}</Text>
                {invoice.url ? (
                  <ExternalLink size={16} color={colors.textDisabled} strokeWidth={1.8} />
                ) : null}
              </Pressable>
            ))}
          </SettingsGroup>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
  },

  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
  },

  fill: {
    maxWidth: "100%",
  },

  error: {
    marginTop: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
  },

  planCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  planCardProblem: {
    borderColor: colors.danger,
  },

  planTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    flexWrap: "wrap",
  },

  planName: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
  },

  planPrice: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },

  planNote: {
    marginTop: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },

  gap: {
    marginTop: spacing.sm,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },

  badge_positive: { backgroundColor: colors.primarySoft },
  badge_info: { backgroundColor: colors.primarySoft },
  badge_danger: { backgroundColor: colors.dangerSoft },
  badge_muted: { backgroundColor: colors.surfaceMuted },

  badgeText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },

  badgeText_positive: { color: colors.positive },
  badgeText_info: { color: colors.primary },
  badgeText_danger: { color: colors.danger },
  badgeText_muted: { color: colors.textMuted },

  meters: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },

  meter: {
    gap: 6,
  },

  meterTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },

  meterLabel: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },

  meterValue: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },

  extra: {
    fontFamily: fonts.semibold,
    color: colors.danger,
  },

  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },

  fillBar: {
    height: "100%",
    borderRadius: 3,
  },

  manage: {
    gap: spacing.sm,
  },

  footer: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },

  footerProblem: {
    color: colors.danger,
  },

  invoices: {
    marginTop: spacing.sm,
  },

  invoice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
  },

  invoicePressed: {
    backgroundColor: colors.surfaceMuted,
  },

  invoiceText: {
    flex: 1,
  },

  invoiceTitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },

  invoiceSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  paid: {
    color: colors.positive,
  },

  open: {
    color: colors.danger,
  },

  invoiceAmount: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
});
