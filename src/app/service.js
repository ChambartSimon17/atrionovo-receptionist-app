import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";

const serviceData = {
  lunch: {
    name: "Middagservice",
    time: "12:00 – 15:00",
    reservations: [
      {
        id: "1",
        time: "12:00",
        firstName: "Pieter",
        lastName: "Janssens",
        guests: 2,
        status: "CONFIRMED",
      },
      {
        id: "2",
        time: "12:30",
        firstName: "Marie",
        lastName: "De Smet",
        guests: 4,
        status: "CONFIRMED",
      },
      {
        id: "3",
        time: "13:00",
        firstName: "Thomas",
        lastName: "Peeters",
        guests: 2,
        status: "CONFIRMED",
      },
      {
        id: "4",
        time: "13:30",
        firstName: "Sophie",
        lastName: "Claes",
        guests: 3,
        status: "CONFIRMED",
      },
    ],
  },

  dinner: {
    name: "Avondservice",
    time: "18:00 – 22:00",
    reservations: [
      {
        id: "5",
        time: "18:00",
        firstName: "Jan",
        lastName: "Vermeulen",
        guests: 2,
        status: "CONFIRMED",
      },
      {
        id: "6",
        time: "18:30",
        firstName: "Sarah",
        lastName: "Maes",
        guests: 4,
        status: "CONFIRMED",
      },
      {
        id: "7",
        time: "19:00",
        firstName: "Koen",
        lastName: "Willems",
        guests: 6,
        status: "CONFIRMED",
      },
      {
        id: "8",
        time: "19:30",
        firstName: "Laura",
        lastName: "De Clercq",
        guests: 2,
        status: "CONFIRMED",
      },
      {
        id: "9",
        time: "20:00",
        firstName: "Tom",
        lastName: "Verhoeven",
        guests: 4,
        status: "CONFIRMED",
      },
      {
        id: "10",
        time: "20:30",
        firstName: "Emma",
        lastName: "Jacobs",
        guests: 2,
        status: "CONFIRMED",
      },
    ],
  },
};

export default function ServiceScreen() {
  const { service } = useLocalSearchParams();
  const { width, height } = useWindowDimensions();

  const isTablet = width >= 768;
  const isLandscape = width > height;
  const isLargeLandscape =
    isTablet && isLandscape;

  const selectedService =
    serviceData[service] ||
    serviceData.lunch;

  const reservations =
    selectedService.reservations;

  const totalGuests =
    reservations.reduce(
      (total, reservation) =>
        total + reservation.guests,
      0
    );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,

          isTablet &&
            styles.tabletContent,

          isLargeLandscape &&
            styles.landscapeContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}

        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backArrow}>
              ←
            </Text>

            <Text style={styles.backText}>
              Vandaag
            </Text>
          </Pressable>
        </View>

        {/* Service information */}

        <View
          style={[
            styles.serviceHeader,

            isLargeLandscape &&
              styles.landscapeServiceHeader,
          ]}
        >
          <View>
            <Text
              style={[
                styles.title,

                isTablet &&
                  styles.tabletTitle,
              ]}
            >
              {selectedService.name}
            </Text>

            <Text style={styles.time}>
              {selectedService.time}
            </Text>
          </View>

          <View
            style={styles.serviceStats}
          >
            <View>
              <Text
                style={
                  styles.serviceStatNumber
                }
              >
                {reservations.length}
              </Text>

              <Text
                style={
                  styles.serviceStatLabel
                }
              >
                reservaties
              </Text>
            </View>

            <View>
              <Text
                style={
                  styles.serviceStatNumber
                }
              >
                {totalGuests}
              </Text>

              <Text
                style={
                  styles.serviceStatLabel
                }
              >
                gasten
              </Text>
            </View>
          </View>
        </View>

        {/* Reservation list */}

        <View
          style={[
            styles.reservationList,

            isLargeLandscape &&
              styles.landscapeReservationList,
          ]}
        >
          <Text style={styles.sectionTitle}>
            Reservaties
          </Text>

          {reservations.map(
            (reservation) => (
              <Pressable
                key={reservation.id}
                onPress={() =>
                  router.push({
                    pathname: "/reservation",
                    params: {
                      id: reservation.id,
                    },
                  })
                }
                style={({ pressed }) => [
                  styles.reservationRow,

                  pressed &&
                    styles.reservationPressed,
                ]}
              >
                {/* Time */}

                <View style={styles.timeColumn}>
                  <Text
                    style={styles.reservationTime}
                  >
                    {reservation.time}
                  </Text>
                </View>

                {/* Reservation */}

                <View
                  style={
                    styles.reservationCard
                  }
                >
                  <View
                    style={
                      styles.reservationMain
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.customerName
                        }
                      >
                        {reservation.firstName}{" "}
                        {reservation.lastName}
                      </Text>

                      <Text
                        style={
                          styles.customerGuests
                        }
                      >
                        {reservation.guests}{" "}
                        {reservation.guests ===
                        1
                          ? "persoon"
                          : "personen"}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.statusBadge
                      }
                    >
                      <Text
                        style={
                          styles.statusText
                        }
                      >
                        Bevestigd
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  tabletContent: {
    paddingHorizontal: 40,
    paddingTop: 44,
  },

  landscapeContent: {
    paddingHorizontal: 56,
    paddingTop: 32,
  },

  /* ============================= */
  /* HEADER */
  /* ============================= */

  header: {
    marginBottom: 28,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },

  backArrow: {
    fontSize: 24,
    color: "#111",
    marginRight: 8,
  },

  backText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },

  /* ============================= */
  /* SERVICE HEADER */
  /* ============================= */

  serviceHeader: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    marginBottom: 34,
  },

  landscapeServiceHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111",
  },

  tabletTitle: {
    fontSize: 34,
  },

  time: {
    fontSize: 16,
    color: "#777",
    marginTop: 6,
  },

  serviceStats: {
    flexDirection: "row",
    gap: 32,
    marginTop: 22,
  },

  serviceStatNumber: {
    fontSize: 25,
    fontWeight: "700",
    color: "#111",
  },

  serviceStatLabel: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },

  /* ============================= */
  /* RESERVATIONS */
  /* ============================= */

  reservationList: {
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
  },

  landscapeReservationList: {
    maxWidth: 1200,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 14,
  },

  reservationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  reservationPressed: {
    opacity: 0.7,
  },

  timeColumn: {
    width: 64,
  },

  reservationTime: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },

  reservationCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ededed",
    padding: 17,
  },

  reservationMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },

  customerGuests: {
    fontSize: 13,
    color: "#777",
    marginTop: 4,
  },

  statusBadge: {
    backgroundColor: "#f1f1f1",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#555",
  },
});