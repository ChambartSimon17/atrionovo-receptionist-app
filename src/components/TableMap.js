import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useEffect } from "react";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { getTableReservationState } from "./table-state";
import {
  colors,
  fonts,
  radius,
  tableColors,
} from "../theme";
import { formatTime } from "../utils/date";

// ======================================================
// Table map
// ======================================================
//
// The floor plan: every table at its own position, coloured
// by its reservation state (free, reserved, arriving,
// seated) with the time of its next reservation.
//
// Tapping a table calls onTableSelect. While editing, the
// tables can be dragged; the new position is passed to
// onTablePositionChange when the drag ends.
// ======================================================

const MIN_CANVAS_HEIGHT = 420;

function nextReservation(table, reservations, currentTime) {
  return reservations
    .filter(
      (reservation) =>
        reservation.tables?.some(
          (reservationTable) =>
            reservationTable.tableId === table.id
        ) &&
        (reservation.status === "SEATED" ||
          new Date(reservation.endTime) > currentTime)
    )
    .sort(
      (a, b) => new Date(a.startTime) - new Date(b.startTime)
    )[0];
}

function Table({
  table,
  reservations,
  currentTime,
  isSelected,
  isEditing,
  onSelect,
  onPositionChange,
}) {
  const isRound = table.shape === "ROUND";

  const state = getTableReservationState(
    table,
    reservations,
    currentTime
  );
  const palette = tableColors[state];
  const next = nextReservation(
    table,
    reservations,
    currentTime
  );

  /*
   * These shared values handle the visual movement
   * of the table during a drag.
   *
   * They live on the UI thread, which means the table
   * can follow the finger without triggering React
   * renders on every movement.
   */
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(table.x);
  const startY = useSharedValue(table.y);

  /*
   * If the table position changes from the backend
   * or parent state, reset the gesture base position.
   */
  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    startX.value = table.x;
    startY.value = table.y;
  }, [table.x, table.y]);

  /*
   * Called only when the drag finishes, on the JS
   * thread through runOnJS().
   */
  const handleDragEnd = (x, y) => {
    onPositionChange?.(table.id, {
      x: Math.max(0, x),
      y: Math.max(0, y),
    });
  };

  const dragGesture = Gesture.Pan()
    .enabled(isEditing)
    .minDistance(8)
    .onBegin(() => {
      startX.value = table.x;
      startY.value = table.y;
      translateX.value = 0;
      translateY.value = 0;
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      runOnJS(handleDragEnd)(
        startX.value + event.translationX,
        startY.value + event.translationY
      );
    });

  const tapGesture = Gesture.Tap()
    .enabled(isEditing)
    .onEnd(() => {
      runOnJS(onSelect)(table);
    });

  const tableGesture = Gesture.Exclusive(
    tapGesture,
    dragGesture
  );

  /*
   * Reanimated applies the translation directly
   * without causing React to render every frame.
   */
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const frame = {
    width: table.width,
    height: table.height,
    left: table.x,
    top: table.y,
    borderRadius: isRound ? 999 : radius.lg,
  };

  const label = (
    <>
      <Text
        style={[
          styles.tableName,
          { color: isEditing ? colors.text : palette.text },
        ]}
        numberOfLines={1}
      >
        {table.name}
      </Text>
      <Text
        style={[
          styles.tableMeta,
          {
            color: isEditing
              ? colors.textMuted
              : palette.muted,
          },
        ]}
        numberOfLines={1}
      >
        {!isEditing && next && state !== "SEATED"
          ? formatTime(next.startTime)
          : `${table.capacity} pl.`}
      </Text>
    </>
  );

  if (isEditing) {
    return (
      <GestureDetector gesture={tableGesture}>
        <Animated.View
          style={[
            styles.table,
            styles.editingTable,
            frame,
            isSelected && styles.selectedTable,
            animatedStyle,
          ]}
        >
          {label}
        </Animated.View>
      </GestureDetector>
    );
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${table.name}, ${table.capacity} plaatsen`}
      activeOpacity={0.8}
      onPress={() => onSelect?.(table)}
      style={[
        styles.table,
        frame,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
        isSelected && styles.selectedTable,
      ]}
    >
      {label}
    </TouchableOpacity>
  );
}

export default function TableMap({
  tables,
  reservations,
  isEditing = false,
  selectedTableId = null,
  onTablePositionChange,
  onTableSelect,
  currentTime = new Date(),
}) {
  const height = Math.max(
    MIN_CANVAS_HEIGHT,
    ...tables.map((table) => table.y + table.height + 24)
  );

  return (
    <View
      style={[
        styles.canvas,
        isEditing && styles.canvasEditing,
        { height },
      ]}
    >
      {tables.map((table) => (
        <Table
          key={table.id}
          table={table}
          reservations={reservations}
          currentTime={currentTime}
          isSelected={selectedTableId === table.id}
          isEditing={isEditing}
          onSelect={onTableSelect}
          onPositionChange={onTablePositionChange}
        />
      ))}

      {tables.length === 0 && (
        <View style={styles.emptyCanvas}>
          <Text style={styles.emptyText}>
            Nog geen tafels. Tik op “Bewerk vloerplan” om
            tafels toe te voegen.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
    overflow: "hidden",
  },

  canvasEditing: {
    borderStyle: "dashed",
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },

  table: {
    position: "absolute",
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    shadowColor: "#1C2421",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },

  editingTable: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderStyle: "dashed",
  },

  selectedTable: {
    borderWidth: 3,
    borderColor: colors.text,
  },

  tableName: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },

  tableMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 1,
  },

  emptyCanvas: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: "center",
    color: colors.textMuted,
  },
});
