import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  useState,
} from "react";

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
  onSelect,
}) {
  const isRound =
    table.shape === "ROUND";

  const reservationState =
    getTableReservationState(
      table,
      reservations,
      currentTime
    );

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
      <Text style={styles.tableName}>
        {table.name}
      </Text>

      <Text style={styles.tableCapacity}>
        {table.capacity}
      </Text>
    </TouchableOpacity>
  );
}

function TableMap({
  tables,
  reservations,
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
    setSelectedTable(table);
  };

  const handleClearSelection = () => {
    setSelectedTable(null);
  };

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
      <TouchableOpacity
        activeOpacity={1}
        onPress={
          handleClearSelection
        }
        style={styles.canvas}
      >
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
            onSelect={
              handleSelectTable
            }
          />
        ))}
      </TouchableOpacity>

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