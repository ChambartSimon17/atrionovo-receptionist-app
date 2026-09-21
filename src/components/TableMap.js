import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  useEffect,
  useState,
} from "react";

import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";

import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import {
  getTableReservationState,
} from "./table-state";

function formatReservationTime(
  dateString
) {
  const date =
    new Date(dateString);

  return date.toLocaleTimeString(
    "nl-BE",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  );
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
  const isRound =
    table.shape === "ROUND";

  const reservationState =
    getTableReservationState(
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
  const translateX =
    useSharedValue(0);

  const translateY =
    useSharedValue(0);

  const startX =
    useSharedValue(table.x);

  const startY =
    useSharedValue(table.y);

  /*
   * If the table position changes from the backend
   * or parent state, reset the gesture base position.
   */
  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;

    startX.value = table.x;
    startY.value = table.y;
  }, [
    table.x,
    table.y,
  ]);

  /*
   * Called only when the drag finishes.
   *
   * This function runs on the JS thread because
   * runOnJS() is used from the gesture callback.
   */
  const handleDragEnd = (
    x,
    y
  ) => {
    onPositionChange?.(
      table.id,
      {
        x,
        y,
      }
    );
  };

  const dragGesture =
    Gesture.Pan()
      .enabled(isEditing)
      .minDistance(8)

      .onBegin(() => {
        startX.value = table.x;
        startY.value = table.y;

        translateX.value = 0;
        translateY.value = 0;
      })

      .onUpdate((event) => {
        translateX.value =
          event.translationX;

        translateY.value =
          event.translationY;
      })

      .onEnd((event) => {
        const newX =
          startX.value +
          event.translationX;

        const newY =
          startY.value +
          event.translationY;

        runOnJS(handleDragEnd)(
          newX,
          newY
        );
      });

  const tapGesture =
    Gesture.Tap()
      .enabled(isEditing)
      .onEnd(() => {
        runOnJS(onSelect)(table);
      });

  const tableGesture =
    Gesture.Exclusive(
      tapGesture,
      dragGesture
    );



  /*
   * Reanimated applies the translation directly
   * without causing React to render every frame.
   */
  const animatedStyle =
    useAnimatedStyle(
      () => ({
        transform: [
          {
            translateX:
              translateX.value,
          },
          {
            translateY:
              translateY.value,
          },
        ],
      })
    );

  if (isEditing) {
    return (
      <GestureDetector
        gesture={tableGesture}
      >
        <Animated.View
          style={[
            styles.table,
            styles.editingTable,
            {
              width: table.width,
              height: table.height,
              left: table.x,
              top: table.y,
              borderRadius:
                isRound
                  ? 999
                  : 12,
            },
            animatedStyle,
          ]}
        >
          <Text
            style={styles.tableName}
          >
            {table.name}
          </Text>

          <Text
            style={styles.tableCapacity}
          >
            {table.capacity}
          </Text>
        </Animated.View>
      </GestureDetector>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() =>
        onSelect(table)
      }
      style={[
        styles.table,
        {
          width: table.width,
          height: table.height,
          left: table.x,
          top: table.y,
          borderRadius: isRound
            ? 999
            : 12,
        },

        reservationState ===
          "RESERVED" &&
          styles.reservedTable,

        reservationState ===
          "ARRIVING" &&
          styles.arrivingTable,

        reservationState ===
          "SEATED" &&
          styles.seatedTable,

        isSelected &&
          styles.selectedTable,
      ]}
    >
      <Text
        style={styles.tableName}
      >
        {table.name}
      </Text>

      <Text
        style={styles.tableCapacity}
      >
        {table.capacity}
      </Text>
    </TouchableOpacity>
  );
}

function TableMap({
  tables,
  reservations,
  isEditing = false,
  onTablePositionChange,
  onTableSelect,
}) {
  const currentTime =
    new Date();

  const [
    selectedTable,
    setSelectedTable,
  ] = useState(null);

  const handleSelectTable = (
    table
  ) => {
    if (isEditing) {
      onTableSelect?.(table);
      return;
    }

    setSelectedTable(table);
  };

  const handleClearSelection = () => {
    if (isEditing) {
      return;
    }

    setSelectedTable(null);
  };

  useEffect(() => {
    if (isEditing) {
      setSelectedTable(null);
    }
  }, [isEditing]);

  const selectedReservations =
    selectedTable
      ? reservations.filter(
          (reservation) =>
            reservation.tables?.some(
              (reservationTable) =>
                reservationTable.tableId ===
                selectedTable.id
            )
        )
      : [];

  return (
    <View style={styles.container}>
      <View style={styles.canvas}>
        {tables.map((table) => (
          <Table
            key={table.id}
            table={table}
            reservations={
              reservations
            }
            currentTime={
              currentTime
            }
            isSelected={
              selectedTable?.id ===
              table.id
            }
            isEditing={
              isEditing
            }
            onSelect={
              handleSelectTable
            }
            onPositionChange={
              onTablePositionChange
            }
          />
        ))}
      </View>

      {selectedTable && (
        <View
          style={styles.selectedInfo}
        >
          <Text
            style={styles.selectedTitle}
          >
            {selectedTable.name}
          </Text>

          {selectedReservations.length ===
          0 ? (
            <Text
              style={styles.availableText}
            >
              Beschikbaar
            </Text>
          ) : (
            selectedReservations.map(
              (reservation) => (
                <View
                  key={
                    reservation.id
                  }
                  style={
                    styles.reservationInfo
                  }
                >
                  <Text
                    style={
                      styles.reservationName
                    }
                  >
                    {
                      reservation.firstName
                    }{" "}
                    {
                      reservation.lastName
                    }
                  </Text>

                  <Text
                    style={
                      styles.reservationDetails
                    }
                  >
                    {
                      reservation.guestCount
                    }{" "}
                    {reservation.guestCount ===
                    1
                      ? "persoon"
                      : "personen"}
                  </Text>

                  <Text
                    style={
                      styles.reservationDetails
                    }
                  >
                    {
                      formatReservationTime(
                        reservation.startTime
                      )
                    }{" "}
                    –{" "}
                    {
                      formatReservationTime(
                        reservation.endTime
                      )
                    }
                  </Text>
                </View>
              )
            )
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },

  canvas: {
    height: 500,
    backgroundColor: "#f2f2f2",
    borderRadius: 16,
    position: "relative",
    overflow: "hidden",
  },

  table: {
    position: "absolute",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d0d0d0",
    alignItems: "center",
    justifyContent: "center",
  },

  editingTable: {
    borderWidth: 2,
    borderColor: "#111111",
  },

  reservedTable: {
    backgroundColor: "#fff4e5",
    borderColor: "#f0a000",
  },

  arrivingTable: {
    backgroundColor: "#fff0f0",
    borderColor: "#d64545",
  },

  seatedTable: {
    backgroundColor: "#e8f5e9",
    borderColor: "#22a06b",
  },

  selectedTable: {
    borderWidth: 3,
    borderColor: "#111111",
  },

  tableName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },

  tableCapacity: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },

  selectedInfo: {
    marginTop: 12,
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 12,
  },

  selectedTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },

  availableText: {
    marginTop: 6,
    fontSize: 14,
    color: "#22a06b",
  },

  reservationInfo: {
    marginTop: 10,
  },

  reservationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },

  reservationDetails: {
    marginTop: 3,
    fontSize: 14,
    color: "#666",
  },
});

export default TableMap;