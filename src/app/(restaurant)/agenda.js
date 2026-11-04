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
import { CalendarDays } from "lucide-react-native";

import DayNavigation from "../../components/DayNavigation";
import { Button, Card } from "../../components/ui";
import useRestaurantDay, {
  minutesOfDay,
} from "../../hooks/useRestaurantDay";
import {
  colors,
  fonts,
  radius,
  spacing,
  statusColors,
  type,
} from "../../theme";
import { formatTime, todayString } from "../../utils/date";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SkeletonList } from "../../components/ui";
import { t } from "../../i18n";

// ======================================================
// Agenda (timeline per table)
// ======================================================
//
// One row per table, the hours of the day from left to
// right and every reservation as a block over the time it
// keeps the table. Free space in a row is a free table, so
// a walk-in is easy to place. The table names stay on the
// left while the hours scroll sideways.
//
// Reservations without a table get their own row.
// ======================================================

const HOUR_WIDTH = 120;
const ROW_HEIGHT = 56;
const NAME_WIDTH = 76;
const HEADER_HEIGHT = 28;

const UNASSIGNED = "unassigned";

function hourLabel(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:00`;
}

export default function RestaurantAgendaScreen() {
  const router = useRouter();

  const [date, setDate] = useState(todayString());

  const {
    reservations,
    openingHours,
    tables,
    isLoading,
    error,
    moveTo,
  } = useRestaurantDay(date);

  // A reservation being dragged to another table:
  // { id, fromIndex, dy }.
  const [drag, setDrag] = useState(null);

  // The hours shown: the opening hours of the week,
  // widened to fit every reservation of the day.
  const opens = [
    ...openingHours.map((period) => period.opensAtMinutes),
    ...reservations.map((reservation) =>
      minutesOfDay(reservation.startTime)
    ),
  ];
  const closes = [
    ...openingHours.map((period) => period.closesAtMinutes),
    ...reservations.map(
      (reservation) =>
        minutesOfDay(reservation.startTime) +
        (new Date(reservation.endTime) -
          new Date(reservation.startTime)) /
          60000
    ),
  ];
  const startMinutes =
    Math.floor((opens.length ? Math.min(...opens) : 660) / 60) *
    60;
  const endMinutes = Math.min(
    24 * 60,
    Math.ceil((closes.length ? Math.max(...closes) : 1380) / 60) *
      60
  );
  const hours = [];

  for (
    let minutes = startMinutes;
    minutes < endMinutes;
    minutes += 60
  ) {
    hours.push(minutes);
  }

  const timelineWidth =
    ((endMinutes - startMinutes) / 60) * HOUR_WIDTH;

  function x(minutes) {
    return ((minutes - startMinutes) / 60) * HOUR_WIDTH;
  }

  // Reservations per row (a reservation on two tables
  // shows on both).
  const rows = tables.map((table) => ({
    id: table.id,
    name: table.name,
    meta: `${table.capacity} pl.`,
    reservations: reservations.filter((reservation) =>
      reservation.tables?.some(
        (reservationTable) =>
          reservationTable.tableId === table.id
      )
    ),
  }));

  const unassigned = reservations.filter(
    (reservation) => !reservation.tables?.length
  );

  if (unassigned.length > 0) {
    rows.push({
      id: UNASSIGNED,
      name: "Geen tafel",
      meta: `${unassigned.length}`,
      reservations: unassigned,
    });
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNow =
    date === todayString() &&
    nowMinutes >= startMinutes &&
    nowMinutes <= endMinutes;

  const targetIndex = drag
    ? Math.max(
        0,
        Math.min(
          rows.length - 1,
          drag.fromIndex + Math.round(drag.dy / ROW_HEIGHT)
        )
      )
    : null;

  // Drops a dragged reservation on the row under it and,
  // after a confirmation, moves it to that table.
  function dropOnRow(reservation, fromIndex, dy) {
    const toIndex = Math.max(
      0,
      Math.min(rows.length - 1, fromIndex + Math.round(dy / ROW_HEIGHT))
    );
    const target = rows[toIndex];

    setDrag(null);

    if (toIndex === fromIndex || !target || target.id === UNASSIGNED) {
      return;
    }

    const table = tables.find((candidate) => candidate.id === target.id);
    const tooSmall = table && table.capacity < reservation.guestCount;

    Alert.alert(
      t("agenda.moveTitle", { table: target.name }),
      tooSmall
        ? t("agenda.moveSmall", {
            name: `${reservation.firstName} ${reservation.lastName}`.trim(),
            count: reservation.guestCount,
            seats: table.capacity,
          })
        : t("agenda.moveMessage", {
            name: `${reservation.firstName} ${reservation.lastName}`.trim(),
            time: formatTime(reservation.startTime),
          }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("agenda.moveConfirm"),
          onPress: () => moveTo(reservation, [target.id]),
        },
      ]
    );
  }

  const covers = reservations.reduce(
    (sum, reservation) => sum + reservation.guestCount,
    0
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.top}>
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <Text style={type.title}>Agenda</Text>
            <Text style={type.caption}>
              {reservations.length === 1
                ? "1 reservatie"
                : `${reservations.length} reservaties`}{" "}
              · {covers} couverts
            </Text>
          </View>
          <Button
            label="Maand"
            onPress={() => router.push("/calendar")}
            icon={
              <CalendarDays
                size={16}
                color={colors.text}
                strokeWidth={1.8}
              />
            }
          />
        </View>

        <DayNavigation date={date} onChange={setDate} />
      </View>

      {isLoading ? (
        <View style={styles.message}>
          <SkeletonList rows={5} />
        </View>
      ) : error ? (
        <Card style={styles.message}>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : rows.length === 0 ? (
        <Card style={styles.message}>
          <Text style={type.caption}>
            Nog geen tafels. Voeg ze toe in Zaal → Bewerk
            vloerplan.
          </Text>
        </Card>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!drag}
        >
          <Card style={styles.grid}>
            {/* Table names */}

            <View style={styles.names}>
              <View style={{ height: HEADER_HEIGHT }} />
              {rows.map((row, index) => (
                <View
                  key={row.id}
                  style={[
                    styles.nameCell,
                    index > 0 && styles.rowDivider,
                  ]}
                >
                  <Text
                    style={[
                      styles.tableName,
                      row.id === UNASSIGNED &&
                        styles.unassignedName,
                    ]}
                    numberOfLines={1}
                  >
                    {row.name}
                  </Text>
                  <Text style={type.caption}>{row.meta}</Text>
                </View>
              ))}
            </View>

            {/* Hours */}

            <ScrollView
              horizontal
              scrollEnabled={!drag}
              showsHorizontalScrollIndicator={false}
              contentOffset={{
                x: showNow
                  ? Math.max(0, x(nowMinutes) - HOUR_WIDTH)
                  : 0,
                y: 0,
              }}
            >
              <View style={{ width: timelineWidth }}>
                <View style={styles.hourHeader}>
                  {hours.map((minutes) => (
                    <Text
                      key={minutes}
                      style={[
                        styles.hourLabel,
                        { left: x(minutes) + 6 },
                      ]}
                    >
                      {hourLabel(minutes)}
                    </Text>
                  ))}
                </View>

                {rows.map((row, index) => (
                  <View
                    key={row.id}
                    style={[
                      styles.timelineRow,
                      index > 0 && styles.rowDivider,
                      drag &&
                        targetIndex === index &&
                        index !== drag.fromIndex &&
                        styles.dropTarget,
                      drag?.fromIndex === index && styles.dragRow,
                    ]}
                  >
                    {hours.map((minutes) => (
                      <View
                        key={minutes}
                        style={[
                          styles.hourLine,
                          { left: x(minutes) },
                        ]}
                      />
                    ))}

                    {row.reservations.map((reservation) => {
                      const start = minutesOfDay(
                        reservation.startTime
                      );
                      const duration =
                        (new Date(reservation.endTime) -
                          new Date(reservation.startTime)) /
                        60000;
                      const seated =
                        reservation.status === "SEATED";
                      const palette = seated
                        ? statusColors.SEATED
                        : statusColors.CONFIRMED;
                      const isDragged =
                        drag?.id === reservation.id &&
                        drag.fromIndex === index;

                      return (
                        <AgendaBlock
                          key={reservation.id}
                          reservation={reservation}
                          palette={palette}
                          dragged={isDragged}
                          dy={isDragged ? drag.dy : 0}
                          style={{
                            left: x(start) + 2,
                            width: Math.max(
                              36,
                              (duration / 60) * HOUR_WIDTH - 4
                            ),
                          }}
                          onOpen={() =>
                            router.push(
                              `/reservation/${reservation.id}`
                            )
                          }
                          onDragStart={() =>
                            setDrag({
                              id: reservation.id,
                              fromIndex: index,
                              dy: 0,
                            })
                          }
                          onDrag={(dy) =>
                            setDrag((current) =>
                              current ? { ...current, dy } : current
                            )
                          }
                          onDrop={(dy) =>
                            dropOnRow(reservation, index, dy)
                          }
                        />
                      );
                    })}
                  </View>
                ))}

                {showNow && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.nowLine,
                      { left: x(nowMinutes) },
                    ]}
                  >
                    <View style={styles.nowDot} />
                  </View>
                )}
              </View>
            </ScrollView>
          </Card>

          <Text style={styles.dragHint}>{t("agenda.dragHint")}</Text>

          <View style={styles.legend}>
            <LegendItem
              color={statusColors.CONFIRMED.background}
              label="Bevestigd"
            />
            <LegendItem
              color={statusColors.SEATED.background}
              label="Aan tafel"
            />
            <LegendItem color={colors.live} label="Nu" line />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// A reservation on the timeline. Tap to open it; hold
// and drag up or down to move it to another table.
function AgendaBlock({
  reservation,
  palette,
  style,
  dragged,
  dy,
  onOpen,
  onDragStart,
  onDrag,
  onDrop,
}) {
  const pan = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(300)
    .onStart(() => onDragStart())
    .onUpdate((event) => onDrag(event.translationY))
    .onEnd((event) => onDrop(event.translationY))
    .onFinalize((event, success) => {
      if (!success) {
        onDrag(0);
      }
    });

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((event, success) => success && onOpen());

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <View
        accessibilityRole="button"
        accessibilityHint={t("agenda.dragHint")}
        style={[
          styles.block,
          style,
          { backgroundColor: palette.background },
          dragged && styles.blockDragged,
          dragged && { transform: [{ translateY: dy }] },
        ]}
      >
        <Text
          style={[styles.blockName, { color: palette.text }]}
          numberOfLines={1}
        >
          {reservation.lastName || reservation.firstName}
        </Text>
        <Text
          style={[styles.blockMeta, { color: palette.text }]}
          numberOfLines={1}
        >
          {reservation.guestCount} p.
          {reservation.notes ? " · ✎" : ""}
        </Text>
      </View>
    </GestureDetector>
  );
}

function LegendItem({ color, label, line = false }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          line ? styles.legendLine : styles.legendSwatch,
          { backgroundColor: color },
        ]}
      />
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dropTarget: {
    backgroundColor: colors.primarySoft,
  },

  dragRow: {
    zIndex: 10,
  },

  blockDragged: {
    zIndex: 20,
    opacity: 0.92,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  dragHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },

  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  top: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  titleText: {
    flex: 1,
    gap: 2,
  },

  loading: {
    marginTop: spacing.xxl,
  },

  message: {
    marginHorizontal: spacing.xl,
  },

  error: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
  },

  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  // Grid

  grid: {
    flexDirection: "row",
    padding: 0,
    overflow: "hidden",
  },

  names: {
    width: NAME_WIDTH,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.surface,
  },

  nameCell: {
    height: ROW_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },

  tableName: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },

  unassignedName: {
    color: colors.live,
  },

  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  hourHeader: {
    height: HEADER_HEIGHT,
  },

  hourLabel: {
    position: "absolute",
    top: 8,
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
  },

  timelineRow: {
    height: ROW_HEIGHT,
  },

  hourLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.divider,
  },

  block: {
    position: "absolute",
    top: 6,
    bottom: 6,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    justifyContent: "center",
  },

  blockPressed: {
    opacity: 0.75,
  },

  blockName: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },

  blockMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    opacity: 0.85,
  },

  nowLine: {
    position: "absolute",
    top: HEADER_HEIGHT - 4,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: colors.live,
  },

  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -3,
    marginTop: -4,
    backgroundColor: colors.live,
  },

  // Legend

  legend: {
    flexDirection: "row",
    gap: spacing.lg,
    paddingHorizontal: spacing.xs,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  legendSwatch: {
    width: 14,
    height: 10,
    borderRadius: 3,
  },

  legendLine: {
    width: 2,
    height: 12,
  },
});
