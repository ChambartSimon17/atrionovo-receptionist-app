import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ReservationCard({
  reservation,
  onPress,
}) {
  const startTime = new Date(
    reservation.startTime
  );

  const time = startTime.toLocaleTimeString(
    "nl-BE",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(reservation)}
      activeOpacity={0.7}
    >
      <View style={styles.timeContainer}>
        <Text style={styles.time}>
          {time}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>
          {reservation.firstName}{" "}
          {reservation.lastName}
        </Text>

        <Text style={styles.details}>
          {reservation.guestCount}{" "}
          {reservation.guestCount === 1
            ? "persoon"
            : "personen"}
        </Text>

        {reservation.notes ? (
          <Text
            style={styles.notes}
            numberOfLines={1}
          >
            {reservation.notes}
          </Text>
        ) : null}
      </View>

      <View style={styles.statusContainer}>
        <View style={styles.statusDot} />

        <Text style={styles.status}>
          Bevestigd
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    minHeight: 82,
    padding: 16,
    marginBottom: 10,

    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  timeContainer: {
    width: 58,
  },

  time: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },

  content: {
    flex: 1,
    paddingHorizontal: 8,
  },

  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },

  details: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },

  notes: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
  },

  statusContainer: {
    alignItems: "flex-end",
    marginLeft: 8,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    marginBottom: 4,
  },

  status: {
    fontSize: 12,
    color: "#666",
  },
});