import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";

import FloorCanvas from "./FloorCanvas";
import { roomLiveState } from "./floor-model";
import { Badge, Button } from "../ui";
import { t } from "../../i18n";
import { colors, floorColors, fonts, radius, spacing } from "../../theme";
import { formatTime } from "../../utils/date";

// ======================================================
// MassageFloorView
// ======================================================
//
// The salon's plan with what every treatment room is
// doing right now: busy (who, with which therapist, how
// long still), ready within ten minutes, being cleaned,
// or free with the next appointment. Floors are tabs.
// Tap a room for the details.
//
// On a wide screen (an iPad) a side list shows every room
// of the floor with who is in it, and the appointments
// still to come today, like the restaurant floor.
// ======================================================

const STATE_BADGE = {
  busy: "IN_PROGRESS",
  soon: "ARRIVING",
  cleaning: "CANCELLED",
  free: "COMPLETED",
};

const MAX_UPCOMING = 8;

const LEGEND = [
  { state: "free", label: "floor.room.legendFree", color: floorColors.free.fill },
  { state: "busy", label: "floor.room.legendBusy", color: floorColors.seated.fill },
  { state: "soon", label: "floor.room.legendSoon", color: floorColors.arriving.fill },
  { state: "cleaning", label: "floor.room.legendCleaning", color: floorColors.cleaning.fill },
];

export default function MassageFloorView({ plan, appointments, now, bufferMinutes }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [areaId, setAreaId] = useState(plan.areas[0]?.id);
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    if (!plan.areas.some((area) => area.id === areaId)) {
      setAreaId(plan.areas[0]?.id);
    }
  }, [plan, areaId]);

  const area = plan.areas.find((candidate) => candidate.id === areaId) ?? plan.areas[0];
  const elements = plan.elements.filter((element) => element.areaId === area?.id);

  const roomStates = useMemo(
    () =>
      Object.fromEntries(
        plan.elements
          .filter((element) => element.type === "ROOM" && element.treatmentRoomId)
          .map((element) => {
            const room = plan.rooms.find((candidate) => candidate.id === element.treatmentRoomId) ?? {
              id: element.treatmentRoomId,
            };

            // The room's own name, also when the plan still
            // carries an old label.
            return [
              element.id,
              { ...roomLiveState(room, appointments, now, bufferMinutes), name: room.name },
            ];
          })
      ),
    [plan.elements, plan.rooms, appointments, now, bufferMinutes]
  );

  const counts = LEGEND.reduce((result, item) => {
    result[item.state] = elements.filter(
      (element) => roomStates[element.id]?.state === item.state
    ).length;
    return result;
  }, {});

  const selected = selection ? elements.find((element) => element.id === selection.id) : null;
  const live = selected ? roomStates[selected.id] : null;
  const room = selected
    ? plan.rooms.find((candidate) => candidate.id === selected.treatmentRoomId)
    : null;

  const areaRooms = elements
    .filter((element) => roomStates[element.id])
    .sort((a, b) =>
      (roomStates[a.id].name ?? "").localeCompare(roomStates[b.id].name ?? "", undefined, { numeric: true })
    );

  const upcoming = appointments
    .filter(
      (appointment) =>
        appointment.status === "CONFIRMED" && new Date(appointment.startTime) > now
    )
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .slice(0, MAX_UPCOMING);

  const activeCount = appointments.filter(
    (appointment) => appointment.status !== "CANCELLED" && appointment.status !== "NO_SHOW"
  ).length;

  const side = (
    <ScrollView style={styles.side} contentContainerStyle={styles.sideContent}>
      <View style={styles.sideHead}>
        <Text style={styles.sideTitle}>{t("floor.room.sideTitle")}</Text>
        <Text style={styles.sideCount}>{t("floor.room.sideCount", { count: activeCount })}</Text>
      </View>

      {areaRooms.map((element) => {
        const state = roomStates[element.id];
        const busy = state.state === "busy" || state.state === "soon";
        const active = selection?.id === element.id;

        return (
          <Pressable
            key={element.id}
            accessibilityRole="button"
            onPress={() => setSelection({ kind: "element", id: element.id })}
            style={({ pressed }) => [
              styles.roomCard,
              active && styles.roomCardActive,
              pressed && styles.roomCardPressed,
            ]}
          >
            <View style={styles.roomCardHead}>
              <Text style={styles.roomName} numberOfLines={1}>
                {state.name ?? element.label}
              </Text>
              <Badge label={t(`floor.room.state.${state.state}`)} status={STATE_BADGE[state.state]} />
            </View>

            <Text style={styles.roomLine} numberOfLines={1}>
              {busy
                ? t("floor.room.nowWith", {
                    name: `${state.appointment.firstName} ${state.appointment.lastName}`.trim(),
                    therapist: state.appointment.therapistName ?? "",
                  })
                : state.state === "cleaning"
                  ? t("floor.room.freeAt", { time: formatTime(state.freeAt.toISOString()) })
                  : state.next
                    ? t("floor.room.nextWith", {
                        time: formatTime(state.next.startTime),
                        name: state.next.firstName,
                      })
                    : t("floor.room.nothingPlanned")}
            </Text>

            {busy ? (
              <View style={styles.roomProgressRow}>
                <View style={styles.roomTrack}>
                  <View
                    style={[styles.roomFill, { width: `${Math.round(state.progress * 100)}%` }]}
                  />
                </View>
                <Text style={styles.roomLeft}>
                  {t("floor.room.minutesLeft", { count: state.minutesLeft })}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}

      {upcoming.length > 0 ? (
        <>
          <Text style={styles.sideSection}>{t("floor.room.upcoming")}</Text>
          <View style={styles.upcomingCard}>
            {upcoming.map((appointment, index) => (
              <View
                key={appointment.id}
                style={[styles.upcomingRow, index > 0 && styles.upcomingDivider]}
              >
                <Text style={styles.upcomingTime}>{formatTime(appointment.startTime)}</Text>
                <View style={styles.flex}>
                  <Text style={styles.upcomingName} numberOfLines={1}>
                    {appointment.firstName} {appointment.lastName}
                  </Text>
                  <Text style={styles.upcomingMeta} numberOfLines={1}>
                    {appointment.serviceName} · {appointment.therapistName} · {appointment.roomName}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );

  return (
    <View style={styles.wrap}>
      {plan.areas.length > 1 ? (
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
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>
              {t(item.label)} {counts[item.state]}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.body, isWide && styles.bodyWide]}>
        {isWide ? side : null}

        <View style={styles.canvas}>
          <FloorCanvas
            area={area}
            elements={elements}
            roomStates={roomStates}
            selection={selection}
            onSelect={(next) =>
              setSelection(next?.kind === "element" && roomStates[next.id] ? next : null)
            }
            fitKey={area?.id}
          />
        </View>
      </View>

      {selected && live ? (
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <View style={styles.flex}>
              <Text style={styles.panelLabel}>
                {(live.name ?? room?.name ?? selected.label ?? "").toUpperCase()}
                {selected.beds > 1 ? ` · ${t("floor.room.duo")}` : ""}
              </Text>
              <Text style={styles.panelTitle} numberOfLines={1}>
                {live.appointment && live.state !== "cleaning"
                  ? live.appointment.serviceName
                  : live.state === "cleaning"
                    ? t("floor.room.cleaning")
                    : t("floor.room.free")}
              </Text>
              <Text style={styles.panelSub} numberOfLines={1}>
                {live.state === "busy" || live.state === "soon"
                  ? `${live.appointment.firstName} ${live.appointment.lastName} · ${t("floor.room.with", {
                      name: live.appointment.therapistName ?? "",
                    })} · ${t("floor.room.minutesLeft", { count: live.minutesLeft })}`
                  : live.state === "cleaning"
                    ? t("floor.room.freeAt", { time: formatTime(live.freeAt.toISOString()) })
                    : live.next
                      ? t("floor.room.nextWith", {
                          time: formatTime(live.next.startTime),
                          name: live.next.firstName,
                        })
                      : t("floor.room.nothingPlanned")}
              </Text>
            </View>
            <Badge
              label={t(`floor.room.state.${live.state}`)}
              status={STATE_BADGE[live.state]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
              onPress={() => setSelection(null)}
              hitSlop={10}
            >
              <X size={20} color={colors.textMuted} strokeWidth={1.8} />
            </Pressable>
          </View>

          {live.progress !== undefined ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progress, { width: `${Math.round(live.progress * 100)}%` }]} />
            </View>
          ) : null}

          <View style={styles.actions}>
            {live.appointment && live.state !== "free" ? (
              <Button
                label={t("floor.room.open")}
                onPress={() => router.push("/massage/dashboard")}
                style={styles.flex}
              />
            ) : null}
            <Button
              label={
                live.next
                  ? t("floor.room.nextAt", { time: formatTime(live.next.startTime) })
                  : t("floor.room.book")
              }
              variant={live.state === "free" ? "primary" : "secondary"}
              onPress={() => router.push("/massage/new-appointment")}
              style={styles.flex}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  wrap: {
    flex: 1,
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

  canvas: {
    flex: 1,
    backgroundColor: floorColors.canvas,
  },

  // Wide screen: rooms and what is coming next on the left

  body: {
    flex: 1,
  },

  bodyWide: {
    flexDirection: "row",
  },

  side: {
    width: 340,
    flexGrow: 0,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.background,
  },

  sideContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },

  sideHead: {
    marginBottom: spacing.xs,
  },

  sideTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.text,
  },

  sideCount: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
  },

  roomCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 6,
  },

  roomCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },

  roomCardPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  roomCardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  roomName: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },

  roomLine: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },

  roomProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  roomTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primarySoft,
    overflow: "hidden",
  },

  roomFill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },

  roomLeft: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.primary,
  },

  sideSection: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: 2,
  },

  upcomingCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },

  upcomingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
  },

  upcomingDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  upcomingTime: {
    width: 44,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },

  upcomingName: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },

  upcomingMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },

  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -16,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
  },

  panelHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },

  panelLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.textMuted,
  },

  panelTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
    marginTop: 2,
  },

  panelSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primarySoft,
    marginTop: spacing.md,
    overflow: "hidden",
  },

  progress: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },

  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
