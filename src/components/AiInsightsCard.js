import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, PhoneCall } from "lucide-react-native";

import { useAuth } from "../context/auth-context";
import { api } from "../services/api";
import { Card, Skeleton } from "./ui";
import { plural, t } from "../i18n";
import { colors, fonts, radius, spacing } from "../theme";
import { formatPrice } from "../utils/price";
import { BUSINESS_TYPES } from "../utils/business-type";

// ======================================================
// AiInsightsCard
// ======================================================
//
// "Afgehandeld door de AI" in Analyse: how many calls the
// AI receptionist answered in the period, what came of
// them, and the bookings it made (covers for a
// restaurant, revenue for a salon). Shows the owner what
// the receptionist does for them.
// ======================================================

export default function AiInsightsCard({ from, to }) {
  const router = useRouter();
  const { business, businessType, accessToken } = useAuth();

  const [stats, setStats] = useState(null);

  const isMassage = businessType === BUSINESS_TYPES.MASSAGE;

  useEffect(() => {
    if (!business?.id) {
      return;
    }

    let active = true;
    setStats(null);

    api
      .getAiStats(business.id, { from, to }, accessToken)
      .then((response) => active && setStats(response?.data ?? response))
      .catch(() => active && setStats({ failed: true }));

    return () => {
      active = false;
    };
  }, [accessToken, business?.id, from, to]);

  if (stats?.failed) {
    return null;
  }

  const bookings = isMassage ? stats?.appointmentCount : stats?.reservationCount;
  const handledShare =
    stats?.callCount > 0
      ? Math.round(((stats.callCount - stats.outcomes.NEEDS_CALLBACK) / stats.callCount) * 100)
      : null;

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <PhoneCall size={18} color={colors.primary} strokeWidth={1.8} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.title}>{t("aiStats.title")}</Text>
          <Text style={styles.caption}>{t("aiStats.caption")}</Text>
        </View>
      </View>

      {!stats ? (
        <View style={styles.loading}>
          <Skeleton height={44} />
        </View>
      ) : (
        <>
          <View style={styles.numbers}>
            <Number value={stats.callCount} label={plural("aiStats.calls", stats.callCount)} />
            <Number
              value={bookings}
              label={isMassage ? plural("aiStats.appointments", bookings) : plural("aiStats.reservations", bookings)}
            />
            <Number
              value={isMassage ? formatPrice(stats.revenueCents) : stats.covers}
              label={isMassage ? t("aiStats.revenue") : plural("aiStats.covers", stats.covers)}
            />
          </View>

          <View style={styles.outcomes}>
            {["BOOKED", "CHANGED", "INFORMATION", "NEEDS_CALLBACK"].map((key) => (
              <View key={key} style={styles.outcome}>
                <Text style={[styles.outcomeValue, key === "NEEDS_CALLBACK" && stats.outcomes[key] > 0 && styles.danger]}>
                  {stats.outcomes[key]}
                </Text>
                <Text style={styles.outcomeLabel} numberOfLines={1}>
                  {t(`calls.outcome.${key}`)}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.summary}>
            {stats.callCount === 0
              ? t("aiStats.none")
              : t("aiStats.summary", { share: handledShare, minutes: stats.minutes })}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/calls")}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <Text style={styles.linkText}>
              {stats.openCallbacks > 0
                ? plural("aiStats.openCallbacks", stats.openCallbacks)
                : t("aiStats.allCalls")}
            </Text>
            <ChevronRight size={16} color={colors.primary} strokeWidth={2} />
          </Pressable>
        </>
      )}
    </Card>
  );
}

function Number({ value, label }) {
  return (
    <View style={styles.number}>
      <Text style={styles.numberValue}>{value ?? "–"}</Text>
      <Text style={styles.numberLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  card: {
    gap: spacing.md,
  },

  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },

  caption: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },

  loading: {
    paddingVertical: spacing.sm,
  },

  numbers: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  number: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },

  numberValue: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    color: colors.primary,
  },

  numberLabel: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.primary,
  },

  outcomes: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },

  outcome: {
    flex: 1,
    alignItems: "center",
  },

  outcomeValue: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },

  outcomeLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },

  danger: {
    color: colors.danger,
  },

  summary: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },

  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  pressed: {
    opacity: 0.6,
  },

  linkText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },
});
