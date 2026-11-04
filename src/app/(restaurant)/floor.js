import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowRightLeft,
  Pencil,
  UserPlus,
  UserX,
  X,
} from "lucide-react-native";

import FloorCanvas from "../../components/floor/FloorCanvas";
import { tableLiveState } from "../../components/floor/floor-model";
import ReservationRow from "../../components/ReservationRow";
import WalkInSheet, { freeTablesForWalkIn } from "../../components/WalkInSheet";
import { Button, Skeleton } from "../../components/ui";
import useFloorPlan from "../../hooks/useFloorPlan";
import useRestaurantDay from "../../hooks/useRestaurantDay";
import { plural, t } from "../../i18n";
import { colors, floorColors, fonts, radius, spacing, type } from "../../theme";
import { formatTime, todayString } from "../../utils/date";

// ======================================================
// Zaal
// ======================================================
//
// The floor plan during the service. Every table shows
// its state (free, reserved, arriving, late, seated) and
// who sits or comes there. Rooms (Binnen, Terras) are
// tabs.
//
// Tap a table: a panel with its reservations and the
// actions (aan tafel, vertrokken, niet gekomen, verplaats)
// or, for a free table, a walk-in.
//
// On an iPad the day's reservations stand next to the
// plan. Tap "Verplaats" or a reservation without a table,
// then tap a free table to put it there.
// ======================================================

const LEGEND = [
  { state: "free", label: "floor.legend.free" },
  { state: "reserved", label: "floor.legend.reserved" },
  { state: "arriving", label: "floor.legend.arriving" },
  { state: "late", label: "floor.legend.late" },
  { state: "seated", label: "floor.legend.seated" },
];

export default function FloorScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const { plan, isLoading: planLoading } = useFloorPlan();
  const day = useRestaurantDay(todayString());

  const [areaId, setAreaId] = useState(null);
  const [selection, setSelection] = useState(null);
  const [walkIn, setWalkIn] = useState(null);
  const [moving, setMoving] = useState(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (plan && !plan.areas.some((area) => area.id === areaId)) {
      setAreaId(plan.areas[0]?.id ?? null);
    }
  }, [plan, areaId]);

  const area = plan?.areas.find((candidate) => candidate.id === areaId);

  // The plan's tables carry the positions; the day's
  // reservations the state.
  const tables = useMemo(() => plan?.tables ?? [], [plan]);
  const areaTables = tables.filter((table) => table.areaId === area?.id);
  const areaElements = plan?.elements.filter((element) => element.areaId === area?.id) ?? [];

  const tableStates = useMemo(
    () =>
      Object.fromEntries(
        tables.map((table) => [table.id, tableLiveState(table, day.reservations, now)])
      ),
    [tables, day.reservations, now]
  );

  const counts = LEGEND.reduce((result, item) => {
    result[item.state] = areaTables.filter(
      (table) => tableStates[table.id]?.state === item.state
    ).length;
    return result;
  }, {});

  const selectedTable =
    selection?.kind === "table" ? tables.find((table) => table.id === selection.id) : null;
  const selectedState = selectedTable ? tableStates[selectedTable.id] : null;

  // While moving: the tables that are free for that
  // reservation's time and big enough.
  const highlightIds = useMemo(() => {
    if (!moving) {
      return undefined;
    }

    const start = new Date(moving.startTime);
    const minutes = Math.max(30, (new Date(moving.endTime) - start) / 60000);

    return freeTablesForWalkIn(
      tables,
      day.reservations.filter((reservation) => reservation.id !== moving.id),
      Math.min(moving.guestCount, Math.max(...tables.map((table) => table.capacity), 1)),
      minutes,
      start
    ).map((option) => option.table.id);
  }, [moving, tables, day.reservations]);

  async function handleSelect(next) {
    if (moving) {
      if (next?.kind === "table") {
        if (!highlightIds?.includes(next.id)) {
          Alert.alert(t("floor.tableTakenTitle"), t("floor.tableTakenMessage"));
          return;
        }

        const ok = await day.moveTo(moving, [next.id]);

        if (ok) {
          setMoving(null);
          setSelection(next);
        }
      }
      return;
    }

    setSelection(next?.kind === "table" ? next : null);
  }

  function confirmNoShow(reservation) {
    Alert.alert(t("floor.noShowTitle"), t("floor.noShowMessage", { name: reservation.firstName }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("floor.noShowConfirm"), style: "destructive", onPress: () => day.noShow(reservation) },
    ]);
  }

  const isLoading = planLoading || day.isLoading;

  const panel = selectedTable ? (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <View style={styles.flex}>
          <Text style={styles.panelLabel}>
            {selectedTable.name} · {t("floor.seatsLong", { count: selectedTable.capacity })}
          </Text>
          <Text style={styles.panelTitle}>
            {selectedState?.reservation
              ? `${selectedState.reservation.firstName} ${selectedState.reservation.lastName}`.trim() ||
                t("floor.walkIn")
              : t("floor.legend.free")}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          onPress={() => setSelection(null)}
          hitSlop={10}
        >
          <X size={20} color={colors.textMuted} strokeWidth={1.8} />
        </Pressable>
      </View>

      {selectedState?.upcoming.length ? (
        <View style={styles.reservations}>
          {selectedState.upcoming.map((reservation, index) => (
            <View key={reservation.id}>
              <ReservationRow
                reservation={reservation}
                tables={tables}
                divider={index > 0}
                now={now}
                busy={day.actionId === reservation.id}
                onPress={() => router.push(`/reservation/${reservation.id}`)}
                onSeat={() => day.seat(reservation)}
                onComplete={() => day.complete(reservation)}
              />
              {reservation.status === "CONFIRMED" ? (
                <View style={styles.extraActions}>
                  <SmallAction
                    icon={ArrowRightLeft}
                    label={t("floor.move")}
                    onPress={() => {
                      setMoving(reservation);
                      setSelection(null);
                    }}
                  />
                  {new Date(reservation.startTime) < now ? (
                    <SmallAction
                      icon={UserX}
                      label={t("floor.noShow")}
                      danger
                      onPress={() => confirmNoShow(reservation)}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.panelEmpty}>{t("floor.noReservationsToday")}</Text>
      )}

      {selectedState?.state !== "seated" ? (
        <Button
          label={t("floor.walkInHere")}
          icon={<UserPlus size={17} color={colors.text} strokeWidth={1.8} />}
          onPress={() => setWalkIn({ table: selectedTable })}
          style={styles.walkInButton}
        />
      ) : null}
    </View>
  ) : null;

  const list = (
    <ScrollView contentContainerStyle={styles.listContent}>
      <Text style={styles.listTitle}>{t("floor.today")}</Text>
      <Text style={type.caption}>
        {plural("floor.reservationsCount", day.reservations.length)} ·{" "}
        {plural("floor.coversCount", day.reservations.reduce((sum, r) => sum + r.guestCount, 0))}
      </Text>
      <View style={styles.listCards}>
        {day.reservations.map((reservation) => {
          const hasTable = reservation.tables?.length > 0;

          return (
            <View
              key={reservation.id}
              style={[
                styles.listCard,
                !hasTable && styles.listCardDashed,
                moving?.id === reservation.id && styles.listCardMoving,
              ]}
            >
              <ReservationRow
                reservation={reservation}
                tables={tables}
                now={now}
                busy={day.actionId === reservation.id}
                onPress={() =>
                  hasTable
                    ? setSelection({ kind: "table", id: reservation.tables[0].tableId })
                    : setMoving(reservation)
                }
                onSeat={() => day.seat(reservation)}
                onComplete={() => day.complete(reservation)}
              />
              {!hasTable ? (
                <Text style={styles.noTable}>{t("floor.noTableHint")}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={type.title}>{t("tabs.floor")}</Text>
          <Text style={type.caption}>
            {t("floor.live", { time: formatTime(now.toISOString()) })}
          </Text>
        </View>
        <Button
          label={t("floor.walkIn")}
          icon={<UserPlus size={17} color={colors.text} strokeWidth={1.8} />}
          onPress={() => setWalkIn({ table: null })}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("floor.edit")}
          onPress={() => router.push("/floor-plan/edit")}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Pencil size={18} color={colors.text} strokeWidth={1.8} />
        </Pressable>
      </View>

      {plan && plan.areas.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabs}
        >
          {plan.areas.map((candidate) => {
            const active = candidate.id === area?.id;

            return (
              <Pressable
                key={candidate.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setAreaId(candidate.id);
                  setSelection(null);
                }}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{candidate.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={styles.legend}>
        {LEGEND.map((item) => (
          <View key={item.state} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: floorColors[item.state].fill }]} />
            <Text style={styles.legendText}>
              {t(item.label)} {counts[item.state]}
            </Text>
          </View>
        ))}
      </View>

      {moving ? (
        <View style={styles.moving}>
          <Text style={styles.movingText} numberOfLines={2}>
            {t("floor.movingHint", {
              name: `${moving.firstName} ${moving.lastName}`.trim(),
              count: moving.guestCount,
            })}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => setMoving(null)} hitSlop={8}>
            <Text style={styles.movingCancel}>{t("common.cancel")}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.body, isWide && styles.bodyWide]}>
        {isWide ? <View style={styles.side}>{list}</View> : null}

        <View style={styles.flex}>
          <View style={styles.canvas}>
            {isLoading || !area ? (
              <View style={styles.canvasLoading}>
                <Skeleton width="60%" height={14} />
              </View>
            ) : areaTables.length === 0 && areaElements.length === 0 ? (
              <View style={styles.canvasEmpty}>
                <Text style={styles.canvasEmptyTitle}>{t("floor.emptyTitle")}</Text>
                <Text style={styles.canvasEmptyText}>{t("floor.emptyText")}</Text>
                <Button
                  variant="primary"
                  label={t("floor.draw")}
                  onPress={() => router.push("/floor-plan/edit")}
                  style={styles.drawButton}
                />
              </View>
            ) : (
              <FloorCanvas
                area={area}
                tables={areaTables}
                elements={areaElements}
                tableStates={tableStates}
                selection={selection}
                onSelect={handleSelect}
                highlightIds={highlightIds}
                fitKey={area.id}
              />
            )}
          </View>
          {panel}
        </View>
      </View>

      <WalkInSheet
        visible={walkIn !== null}
        onClose={() => setWalkIn(null)}
        tables={tables}
        reservations={day.reservations}
        table={walkIn?.table}
        onConfirm={async (data) => {
          const created = await day.walkIn(data);

          if (created?.tables?.[0]) {
            setSelection({ kind: "table", id: created.tables[0].tableId });
          }

          return Boolean(created);
        }}
      />
    </SafeAreaView>
  );
}

function SmallAction({ icon: Icon, label, onPress, danger }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}
    >
      <Icon size={14} color={danger ? colors.danger : colors.textMuted} strokeWidth={2} />
      <Text style={[styles.smallActionText, danger && styles.danger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  pressed: {
    opacity: 0.6,
  },

  tabsScroll: {
    flexGrow: 0,
  },

  tabs: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },

  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  tabText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
  },

  tabTextActive: {
    color: colors.onPrimary,
    fontFamily: fonts.semibold,
  },

  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },

  legendText: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: colors.textMuted,
  },

  moving: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
  },

  movingText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.warning,
  },

  movingCancel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.warning,
  },

  body: {
    flex: 1,
  },

  bodyWide: {
    flexDirection: "row",
  },

  side: {
    width: 340,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },

  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  listTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.text,
  },

  listCards: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  listCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },

  listCardDashed: {
    borderStyle: "dashed",
  },

  listCardMoving: {
    borderColor: colors.warning,
    borderWidth: 2,
  },

  noTable: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: colors.warning,
    paddingBottom: spacing.sm,
  },

  canvas: {
    flex: 1,
    marginHorizontal: 0,
    backgroundColor: floorColors.canvas,
  },

  canvasLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  canvasEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
  },

  canvasEmptyTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: floorColors.selection,
  },

  canvasEmptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: floorColors.decorText,
    textAlign: "center",
    marginTop: spacing.xs,
  },

  drawButton: {
    marginTop: spacing.lg,
  },

  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -16,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    maxHeight: 360,
    borderTopWidth: 1,
    borderColor: colors.border,
  },

  panelHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },

  panelLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
  },

  panelTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
    marginTop: 2,
  },

  reservations: {
    marginTop: spacing.sm,
  },

  extraActions: {
    flexDirection: "row",
    gap: spacing.md,
    paddingBottom: spacing.sm,
    paddingLeft: 56,
  },

  smallAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },

  smallActionText: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.textMuted,
  },

  danger: {
    color: colors.danger,
  },

  panelEmpty: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  walkInButton: {
    marginTop: spacing.md,
  },
});
