import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
// ======================================================

const LEGEND = [
  { state: "free", label: "floor.room.legendFree", color: floorColors.free.fill },
  { state: "busy", label: "floor.room.legendBusy", color: floorColors.seated.fill },
  { state: "soon", label: "floor.room.legendSoon", color: floorColors.arriving.fill },
  { state: "cleaning", label: "floor.room.legendCleaning", color: floorColors.cleaning.fill },
];

export default function MassageFloorView({ plan, appointments, now, bufferMinutes }) {
  const router = useRouter();

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
          .map((element) => [
            element.id,
            roomLiveState(
              plan.rooms.find((room) => room.id === element.treatmentRoomId) ?? {
                id: element.treatmentRoomId,
              },
              appointments,
              now,
              bufferMinutes
            ),
          ])
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

      {selected && live ? (
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <View style={styles.flex}>
              <Text style={styles.panelLabel}>
                {(room?.name ?? selected.label ?? "").toUpperCase()}
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
              status={live.state === "busy" ? "IN_PROGRESS" : live.state === "soon" ? "ARRIVING" : live.state === "cleaning" ? "CANCELLED" : "COMPLETED"}
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
