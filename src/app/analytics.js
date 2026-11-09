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
import Columns from "../components/ui/Columns";
import useWideLayout from "../hooks/useWideLayout";

import {
  Card,
  SegmentedControl,
  Skeleton,
  SkeletonTiles,
  StatTile,
} from "../components/ui";
import useRestaurantAnalytics from "../hooks/useRestaurantAnalytics";
import {
  colors,
  fonts,
  radius,
  spacing,
  touchTarget,
  type,
} from "../theme";
import {
  addDays,
  todayString,
} from "../utils/date";
import AiInsightsCard from "../components/AiInsightsCard";

// ======================================================
// Analyse
// ======================================================
//
// The numbers of the restaurant for a week or a month:
// covers per day, reservations, party size, guests who did
// not come, cancellations, lunch against dinner, new and
// returning guests, the busiest hours and weekdays, party
// sizes, the best guests and those who missed most.
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

const SERVICE_COLORS = [
  colors.sand,
  colors.primary,
  colors.sage,
];

function shortDay(dateString) {
  const date = parseDay(dateString);

  return `${date.getDate()} ${MONTHS[date.getMonth()].slice(
    0,
    3
  )}`;
}

function reservationsLabel(count) {
  return count === 1 ? "1 reservatie" : `${count} reservaties`;
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function RestaurantAnalyticsScreen() {
  const router = useRouter();

  const [period, setPeriod] = useState("month");
  const wide = useWideLayout();
  const [anchor, setAnchor] = useState(todayString);

  const days = periodDays(period, anchor);

  const { analytics, isLoading, progress, error } =
    useRestaurantAnalytics(days);

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

  const maxDayCovers = Math.max(
    1,
    ...(analytics?.days ?? []).map((day) => day.covers)
  );
  const bestDay = (analytics?.days ?? []).reduce(
    (best, day) =>
      day.covers > (best?.covers ?? 0) ? day : best,
    null
  );
  const maxHour = Math.max(
    1,
    ...(analytics?.hours ?? []).map((hour) => hour.count)
  );
  const maxWeekday = Math.max(
    1,
    ...(analytics?.weekdays ?? []).map((day) => day.covers)
  );
  const maxParty = Math.max(
    1,
    ...(analytics?.parties ?? []).map((size) => size.count)
  );
  const maxGuest = Math.max(
    1,
    ...(analytics?.topGuests ?? []).map((guest) => guest.count)
  );
  const serviceCovers = (analytics?.services ?? []).reduce(
    (sum, service) => sum + service.covers,
    0
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
                  {/* Covers */}

                  <Card tone="primary" style={styles.coversCard}>
                    <View style={styles.coversTop}>
                      <View style={styles.coversText}>
                        <Text style={styles.coversLabel}>Couverts</Text>
                        <Text style={styles.coversValue}>
                          {analytics.covers}
                        </Text>
                      </View>
                      {analytics.upcomingCount > 0 && (
                        <View style={styles.plannedPill}>
                          <Text style={styles.plannedText}>
                            {analytics.upcomingCount} nog gepland
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
                                  (day.covers / maxDayCovers) * 100
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
                        {shortDay(days[0])}
                      </Text>
                      <Text style={styles.barLegendText}>
                        {bestDay
                          ? `Drukste dag: ${shortDay(bestDay.day)} · ${bestDay.covers} couverts`
                          : "Nog geen couverts"}
                      </Text>
                      <Text style={styles.barLegendText}>
                        {shortDay(days[days.length - 1])}
                      </Text>
                    </View>
                  </Card>

                  {/* Key numbers */}

                  <View style={styles.tiles}>
                    <StatTile
                      style={styles.tile}
                      label="Reservaties"
                      value={String(analytics.reservationCount)}
                      note={`${analytics.cameCount} gekomen`}
                    />
                    <StatTile
                      style={styles.tile}
                      label="Gem. groep"
                      value={
                        analytics.averageParty
                          ? String(
                              Math.round(analytics.averageParty * 10) /
                                10
                            )
                          : "–"
                      }
                      note="personen per tafel"
                    />
                    <StatTile
                      style={styles.tile}
                      label="Gasten"
                      value={String(analytics.guestCount)}
                      note={`${analytics.newGuestCount} nieuw`}
                    />
                    <StatTile
                      style={styles.tile}
                      label="Terugkerend"
                      value={formatPercent(analytics.returningRate)}
                      note="van de gasten"
                    />
                    <StatTile
                      style={[styles.tile, styles.warningTile]}
                      label="Niet gekomen"
                      value={formatPercent(analytics.missedRate)}
                      note={reservationsLabel(analytics.missedCount)}
                    />
                    <StatTile
                      style={styles.tile}
                      label="Geannuleerd"
                      value={formatPercent(analytics.cancelledRate)}
                      note={reservationsLabel(analytics.cancelledCount)}
                    />
                  </View>

                  <AiInsightsCard {...periodRange(days)} />

                  {/* Lunch and dinner */}

                  {analytics.services.length > 0 && (
                    <Card style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Text style={type.heading}>Per service</Text>
                        <Text style={type.caption}>couverts</Text>
                      </View>
                      <View style={styles.splitTrack}>
                        {analytics.services.map((service, index) => (
                          <View
                            key={service.name}
                            style={[
                              styles.splitPart,
                              {
                                flex: Math.max(service.covers, 0.01),
                                backgroundColor:
                                  SERVICE_COLORS[
                                    index % SERVICE_COLORS.length
                                  ],
                              },
                            ]}
                          />
                        ))}
                      </View>
                      {analytics.services.map((service, index) => (
                        <View key={service.name} style={styles.splitRow}>
                          <View
                            style={[
                              styles.splitDot,
                              {
                                backgroundColor:
                                  SERVICE_COLORS[
                                    index % SERVICE_COLORS.length
                                  ],
                              },
                            ]}
                          />
                          <Text style={[type.body, styles.splitName]}>
                            {service.name}
                          </Text>
                          <Text style={type.caption}>
                            {service.count} res. ·{" "}
                            {serviceCovers
                              ? formatPercent(
                                  service.covers / serviceCovers
                                )
                              : "0%"}
                          </Text>
                          <Text style={styles.barItemValue}>
                            {service.covers}
                          </Text>
                        </View>
                      ))}
                    </Card>
                  )}

                </>
              }
              right={
                <>
                  {/* Busiest hours */}

                  {analytics.hours.length > 0 && (
                    <ColumnChart
                      title="Drukste uren"
                      caption="reservaties per starttijd"
                      items={analytics.hours.map((hour) => ({
                        key: String(hour.hour),
                        label: `${hour.hour}u`,
                        ratio: hour.count / maxHour,
                      }))}
                    />
                  )}

                  {/* Weekdays */}

                  {analytics.covers > 0 && (
                    <ColumnChart
                      title="Drukste dagen"
                      caption="couverts per weekdag"
                      items={analytics.weekdays.map((day) => ({
                        key: day.label,
                        label: day.label,
                        ratio: day.covers / maxWeekday,
                      }))}
                    />
                  )}

                  {/* Party sizes */}

                  <BarList
                    title="Grootte van de groep"
                    caption="reservaties"
                    empty="Nog geen reservaties in deze periode."
                    items={
                      analytics.reservationCount
                        ? analytics.parties.map((size) => ({
                            key: size.label,
                            label: `${size.label} personen`,
                            value: String(size.count),
                            ratio: size.count / maxParty,
                          }))
                        : []
                    }
                  />

                  {/* Best guests */}

                  <BarList
                    title="Vaste gasten"
                    caption="reservaties"
                    empty="Nog geen gasten in deze periode."
                    items={analytics.topGuests.map((guest) => ({
                      key: guest.id,
                      label: guest.name,
                      value: String(guest.count - guest.missed),
                      ratio: (guest.count - guest.missed) / maxGuest,
                      onPress: () => router.push(`/customers/${guest.id}`),
                    }))}
                  />

                  {/* Guests who did not come */}

                  {analytics.missedGuests.length > 0 && (
                    <Card style={styles.section}>
                      <Text style={type.heading}>
                        Meeste keren niet gekomen
                      </Text>
                      {analytics.missedGuests.map((guest) => (
                        <Pressable
                          key={guest.id}
                          accessibilityRole="button"
                          onPress={() =>
                            router.push(`/customers/${guest.id}`)
                          }
                          style={styles.noShowRow}
                        >
                          <Text style={type.body}>{guest.name}</Text>
                          <Text style={styles.noShowCount}>
                            {guest.missed}×
                          </Text>
                        </Pressable>
                      ))}
                    </Card>
                  )}

                  <Text style={styles.footnote}>
                    Een bevestigde reservatie die voorbij is zonder
                    dat de gasten aan tafel zijn gezet, telt als
                    niet gekomen.
                  </Text>
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
          <Pressable
            key={item.key}
            accessibilityRole={item.onPress ? "button" : undefined}
            disabled={!item.onPress}
            onPress={item.onPress}
            style={styles.barItem}
          >
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
          </Pressable>
        ))
      )}
    </Card>
  );
}

function ColumnChart({ title, caption, items }) {
  return (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={type.heading}>{title}</Text>
        <Text style={type.caption}>{caption}</Text>
      </View>
      <View style={styles.hourBars}>
        {items.map((item) => (
          <View key={item.key} style={styles.hourSlot}>
            <View style={styles.hourTrack}>
              <View
                style={[
                  styles.hourBar,
                  {
                    height: `${Math.max(2, item.ratio * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.hourLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
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

  loadingBox: {
    marginTop: spacing.xxl,
    alignItems: "center",
    gap: spacing.sm,
  },

  footnote: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },

  splitTrack: {
    flexDirection: "row",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    gap: 2,
  },

  splitPart: {
    height: 10,
  },

  splitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  splitDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  splitName: {
    flex: 1,
  },

  error: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
  },

  coversCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },

  coversTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },

  coversText: {
    gap: spacing.xs,
  },

  coversLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.onPrimaryMuted,
  },

  coversValue: {
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
