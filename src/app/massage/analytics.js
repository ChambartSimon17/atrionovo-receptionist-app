import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import Columns from "../../components/ui/Columns";
import useWideLayout from "../../hooks/useWideLayout";

import {
  Card,
  SegmentedControl,
  Skeleton,
  SkeletonTiles,
  StatTile,
} from "../../components/ui";
import useMassageAnalytics from "../../hooks/useMassageAnalytics";
import {
  colors,
  fonts,
  radius,
  spacing,
  touchTarget,
  type,
} from "../../theme";
import {
  addDays,
  todayString,
} from "../../utils/date";
import AiInsightsCard from "../../components/AiInsightsCard";

// ======================================================
// Analyse
// ======================================================
//
// The numbers of the business for a week or a month:
// revenue per day, appointments, average spend, no-shows
// (and what they cost), new and returning clients, the
// best-selling massages, the busiest therapists and the
// busiest hours.
// ======================================================

const PERIODS = [
  { value: "week", label: "Week" },
  { value: "month", label: "Maand" },
];

const MONTHS = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];


// The period as ISO instants for the AI numbers: from the
// start of the first day to the end of the last.
function periodRange(days) {
  const [startYear, startMonth, startDay] = days[0].split("-").map(Number);
  const [endYear, endMonth, endDay] = days[days.length - 1].split("-").map(Number);

  return {
    from: new Date(startYear, startMonth - 1, startDay).toISOString(),
    to: new Date(endYear, endMonth - 1, endDay + 1).toISOString(),
  };
}

function parseDay(dateString) {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day, 12);
}

function periodDays(period, anchor) {
  if (period === "week") {
    const weekday = parseDay(anchor).getDay();
    const monday = addDays(
      anchor,
      weekday === 0 ? -6 : 1 - weekday
    );

    return Array.from({ length: 7 }, (_, index) =>
      addDays(monday, index)
    );
  }

  const date = parseDay(anchor);
  const first = `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-01`;
  const length = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();

  return Array.from({ length }, (_, index) =>
    addDays(first, index)
  );
}

function periodLabel(period, days) {
  const first = parseDay(days[0]);
  const last = parseDay(days[days.length - 1]);

  if (period === "month") {
    return `${MONTHS[first.getMonth()]} ${first.getFullYear()}`;
  }

  return first.getMonth() === last.getMonth()
    ? `${first.getDate()}–${last.getDate()} ${
        MONTHS[first.getMonth()]
      }`
    : `${first.getDate()} ${MONTHS[first.getMonth()].slice(
        0,
        3
      )} – ${last.getDate()} ${MONTHS[last.getMonth()].slice(
        0,
        3
      )}`;
}

// 1248000 -> "€ 12.480"
function formatEuro(cents) {
  const euros = Math.round((cents ?? 0) / 100);

  return `€ ${String(euros).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    "."
  )}`;
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function MassageAnalyticsScreen() {
  const router = useRouter();

  const [period, setPeriod] = useState("month");
  const wide = useWideLayout();
  const [anchor, setAnchor] = useState(todayString);

  const days = periodDays(period, anchor);

  const { analytics, isLoading, error } =
    useMassageAnalytics(days);

  // A week back or forward, or the month before or after.
  function shift(direction) {
    if (period === "week") {
      setAnchor(addDays(anchor, direction * 7));
    } else if (direction > 0) {
      setAnchor(addDays(days[days.length - 1], 1));
    } else {
      setAnchor(addDays(days[0], -1));
    }
  }

  const maxDayRevenue = Math.max(
    1,
    ...analytics.days.map((day) => day.revenueCents)
  );
  const bestDay = analytics.days.reduce(
    (best, day) =>
      day.revenueCents > (best?.revenueCents ?? 0)
        ? day
        : best,
    null
  );
  const maxService = Math.max(
    1,
    ...analytics.topServices.map(
      (service) => service.revenueCents
    )
  );
  const maxTherapist = Math.max(
    1,
    ...analytics.topTherapists.map(
      (therapist) => therapist.count
    )
  );
  const maxHour = Math.max(
    1,
    ...analytics.hours.map((hour) => hour.count)
  );

  const isCurrent = days.includes(todayString());

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Terug"
          onPress={() => router.back()}
          style={styles.iconButton}
        >
          <ChevronLeft
            size={20}
            color={colors.text}
            strokeWidth={1.8}
          />
        </Pressable>
        <Text style={type.title}>Analyse</Text>
        <View style={styles.iconSpacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, wide && styles.contentWide]}>
        <SegmentedControl
          options={PERIODS}
          value={period}
          onChange={(value) => {
            setPeriod(value);
            setAnchor(todayString());
          }}
        />

        <View style={styles.periodRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Vorige periode"
            onPress={() => shift(-1)}
            style={styles.iconButton}
          >
            <ChevronLeft
              size={18}
              color={colors.text}
              strokeWidth={1.8}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isCurrent}
            onPress={() => setAnchor(todayString())}
            style={styles.periodLabel}
          >
            <Text style={styles.periodText}>
              {capitalize(periodLabel(period, days))}
            </Text>
            {!isCurrent && (
              <Text style={styles.periodHint}>
                Tik voor nu
              </Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volgende periode"
            onPress={() => shift(1)}
            style={styles.iconButton}
          >
            <ChevronRight
              size={18}
              color={colors.text}
              strokeWidth={1.8}
            />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.skeletons}>
            <Skeleton height={190} style={styles.skeletonCard} />
            <SkeletonTiles />
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            <Columns
              gap={spacing.md}
              left={
                <>
                  {/* Revenue */}

                  <Card tone="primary" style={styles.revenueCard}>
                    <View style={styles.revenueTop}>
                      <View style={styles.revenueText}>
                        <Text style={styles.revenueLabel}>
                          Omzet (afgerond)
                        </Text>
                        <Text style={styles.revenueValue}>
                          {formatEuro(
                            analytics.completedRevenueCents
                          )}
                        </Text>
                      </View>
                      {analytics.plannedRevenueCents > 0 && (
                        <View style={styles.plannedPill}>
                          <Text style={styles.plannedText}>
                            + {formatEuro(
                              analytics.plannedRevenueCents
                            )}{" "}
                            gepland
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.bars}>
                      {analytics.days.map((day) => (
                        <View key={day.day} style={styles.barSlot}>
                          <View
                            style={[
                              styles.bar,
                              {
                                height: `${Math.max(
                                  4,
                                  (day.revenueCents / maxDayRevenue) *
                                    100
                                )}%`,
                                backgroundColor:
                                  bestDay?.day === day.day
                                    ? colors.sand
                                    : "#4E8A7E",
                              },
                            ]}
                          />
                        </View>
                      ))}
                    </View>

                    <View style={styles.barLegend}>
                      <Text style={styles.barLegendText}>
                        {parseDay(days[0]).getDate()}{" "}
                        {MONTHS[parseDay(days[0]).getMonth()].slice(
                          0,
                          3
                        )}
                      </Text>
                      <Text style={styles.barLegendText}>
                        {bestDay
                          ? `Beste dag: ${parseDay(
                              bestDay.day
                            ).getDate()} ${MONTHS[
                              parseDay(bestDay.day).getMonth()
                            ].slice(0, 3)} · ${formatEuro(
                              bestDay.revenueCents
                            )}`
                          : "Nog geen omzet"}
                      </Text>
                      <Text style={styles.barLegendText}>
                        {parseDay(days[days.length - 1]).getDate()}{" "}
                        {MONTHS[
                          parseDay(days[days.length - 1]).getMonth()
                        ].slice(0, 3)}
                      </Text>
                    </View>
                  </Card>

                  {/* Key numbers */}

                  <View style={styles.tiles}>
                    <StatTile
                      style={styles.tile}
                      label="Afspraken"
                      value={String(analytics.appointmentCount)}
                      note={`${analytics.completedCount} afgerond`}
                    />
                    <StatTile
                      style={styles.tile}
                      label="Gem. besteding"
                      value={formatEuro(analytics.averageSpendCents)}
                      note="per afgeronde massage"
                    />
                    <StatTile
                      style={styles.tile}
                      label="Klanten"
                      value={String(analytics.clientCount)}
                      note={`${analytics.newClientCount} nieuw`}
                    />
                    <StatTile
                      style={styles.tile}
                      label="Terugkerend"
                      value={formatPercent(analytics.returningRate)}
                      note="van de klanten"
                    />
                    <StatTile
                      style={[styles.tile, styles.warningTile]}
                      label="No-shows"
                      value={formatPercent(analytics.noShowRate)}
                      note={`${analytics.noShowCount} · ${formatEuro(
                        analytics.missedRevenueCents
                      )} gemist`}
                    />
                    <StatTile
                      style={styles.tile}
                      label="Geannuleerd"
                      value={String(analytics.cancelledCount)}
                      note="afspraken"
                    />
                  </View>

                  <AiInsightsCard {...periodRange(days)} />

                </>
              }
              right={
                <>
                  {/* Massages */}

                  <BarList
                    title="Populairste massages"
                    caption="omzet"
                    empty="Nog geen afspraken in deze periode."
                    items={analytics.topServices.map((service) => ({
                      key: service.name,
                      label: service.name,
                      value: formatEuro(service.revenueCents),
                      ratio: service.revenueCents / maxService,
                    }))}
                  />

                  {/* Therapists */}

                  <BarList
                    title="Therapeuten"
                    caption="afspraken"
                    empty="Nog geen afspraken in deze periode."
                    items={analytics.topTherapists.map(
                      (therapist) => ({
                        key: therapist.name,
                        label: therapist.name,
                        value: String(therapist.count),
                        ratio: therapist.count / maxTherapist,
                      })
                    )}
                  />

                  {/* Busiest hours */}

                  {analytics.hours.length > 0 && (
                    <Card style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Text style={type.heading}>Drukste uren</Text>
                        <Text style={type.caption}>
                          starttijd
                        </Text>
                      </View>
                      <View style={styles.hourBars}>
                        {analytics.hours.map((hour) => (
                          <View
                            key={hour.hour}
                            style={styles.hourSlot}
                          >
                            <View style={styles.hourTrack}>
                              <View
                                style={[
                                  styles.hourBar,
                                  {
                                    height: `${
                                      (hour.count / maxHour) * 100
                                    }%`,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={styles.hourLabel}>
                              {hour.hour}u
                            </Text>
                          </View>
                        ))}
                      </View>
                    </Card>
                  )}

                  {/* No-show clients */}

                  {analytics.noShowClients.length > 0 && (
                    <Card style={styles.section}>
                      <Text style={type.heading}>
                        Meeste no-shows
                      </Text>
                      {analytics.noShowClients.map((client) => (
                        <View
                          key={client.name}
                          style={styles.noShowRow}
                        >
                          <Text style={type.body}>{client.name}</Text>
                          <Text style={styles.noShowCount}>
                            {client.count}×
                          </Text>
                        </View>
                      ))}
                    </Card>
                  )}
                </>
              }
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BarList({ title, caption, items, empty }) {
  return (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={type.heading}>{title}</Text>
        <Text style={type.caption}>{caption}</Text>
      </View>
      {items.length === 0 ? (
        <Text style={type.caption}>{empty}</Text>
      ) : (
        items.map((item) => (
          <View key={item.key} style={styles.barItem}>
            <View style={styles.barItemText}>
              <Text style={type.body} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.barItemValue}>
                {item.value}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.max(
                      2,
                      item.ratio * 100
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  skeletons: {
    gap: spacing.md,
    marginTop: spacing.md,
  },

  skeletonCard: {
    borderRadius: radius.xl,
  },

  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },

  iconButton: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  iconSpacer: {
    width: touchTarget,
  },

  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  // Tablet in landscape: two columns

  contentWide: {
    maxWidth: 1180,
  },

  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  periodLabel: {
    flex: 1,
    minHeight: touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },

  periodText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },

  periodHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },

  loading: {
    marginTop: spacing.xxl,
  },

  error: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
  },

  revenueCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },

  revenueTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },

  revenueText: {
    gap: spacing.xs,
  },

  revenueLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.onPrimaryMuted,
  },

  revenueValue: {
    fontFamily: fonts.semibold,
    fontSize: 30,
    letterSpacing: -0.5,
    color: colors.onPrimary,
  },

  plannedPill: {
    backgroundColor: "#2C7466",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  plannedText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#E3F2EC",
  },

  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 64,
  },

  barSlot: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },

  bar: {
    borderRadius: 3,
  },

  barLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  barLegendText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.onPrimaryMuted,
  },

  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  tile: {
    flexBasis: "47%",
    flexGrow: 1,
  },

  warningTile: {
    backgroundColor: colors.noteBackground,
    borderColor: colors.noteBorder,
  },

  section: {
    gap: spacing.md,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  barItem: {
    gap: 6,
  },

  barItemText: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  barItemValue: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },

  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.divider,
    overflow: "hidden",
  },

  barFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },

  hourBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
  },

  hourSlot: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },

  hourTrack: {
    width: "100%",
    height: 72,
    justifyContent: "flex-end",
  },

  hourBar: {
    width: "100%",
    borderRadius: 3,
    backgroundColor: colors.sage,
  },

  hourLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textMuted,
  },

  noShowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  noShowCount: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.warning,
  },
});
