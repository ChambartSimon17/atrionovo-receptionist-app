import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";

const reservations = {
  "1": {
    id: "1",
    time: "12:00",
    firstName: "Pieter",
    lastName: "Janssens",
    guests: 2,
    status: "CONFIRMED",
    phoneNumber: "+32 470 12 34 56",
    email: "pieter.janssens@email.com",
    notes: "Verjaardag",
  },

  "2": {
    id: "2",
    time: "12:30",
    firstName: "Marie",
    lastName: "De Smet",
    guests: 4,
    status: "CONFIRMED",
    phoneNumber: "+32 471 23 45 67",
    email: "marie.desmet@email.com",
    notes: null,
  },

  "3": {
    id: "3",
    time: "13:00",
    firstName: "Thomas",
    lastName: "Peeters",
    guests: 2,
    status: "CONFIRMED",
    phoneNumber: "+32 472 34 56 78",
    email: "thomas.peeters@email.com",
    notes: null,
  },

  "4": {
    id: "4",
    time: "13:30",
    firstName: "Sophie",
    lastName: "Claes",
    guests: 3,
    status: "CONFIRMED",
    phoneNumber: "+32 473 45 67 89",
    email: "sophie.claes@email.com",
    notes: "Allergie voor noten",
  },

  "5": {
    id: "5",
    time: "18:00",
    firstName: "Jan",
    lastName: "Vermeulen",
    guests: 2,
    status: "CONFIRMED",
    phoneNumber: "+32 474 56 78 90",
    email: "jan.vermeulen@email.com",
    notes: null,
  },

  "6": {
    id: "6",
    time: "18:30",
    firstName: "Sarah",
    lastName: "Maes",
    guests: 4,
    status: "CONFIRMED",
    phoneNumber: "+32 475 67 89 01",
    email: "sarah.maes@email.com",
    notes: null,
  },

  "7": {
    id: "7",
    time: "19:00",
    firstName: "Koen",
    lastName: "Willems",
    guests: 6,
    status: "CONFIRMED",
    phoneNumber: "+32 476 78 90 12",
    email: "koen.willems@email.com",
    notes: "Grote tafel gewenst",
  },

  "8": {
    id: "8",
    time: "19:30",
    firstName: "Laura",
    lastName: "De Clercq",
    guests: 2,
    status: "CONFIRMED",
    phoneNumber: "+32 477 89 01 23",
    email: "laura.declercq@email.com",
    notes: null,
  },

  "9": {
    id: "9",
    time: "20:00",
    firstName: "Tom",
    lastName: "Verhoeven",
    guests: 4,
    status: "CONFIRMED",
    phoneNumber: "+32 478 90 12 34",
    email: "tom.verhoeven@email.com",
    notes: null,
  },

  "10": {
    id: "10",
    time: "20:30",
    firstName: "Emma",
    lastName: "Jacobs",
    guests: 2,
    status: "CONFIRMED",
    phoneNumber: "+32 479 01 23 45",
    email: "emma.jacobs@email.com",
    notes: null,
  },
};

export default function ReservationScreen() {
  const { id } = useLocalSearchParams();

  const reservation =
    reservations[String(id)];

  if (!reservation) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundTitle}>
          Reservatie niet gevonden
        </Text>

        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            Terug
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.content
        }
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
              Reservaties
            </Text>
          </Pressable>
        </View>

        {/* Customer */}

        <View style={styles.customerHeader}>
          <View>
            <Text style={styles.customerName}>
              {reservation.firstName}{" "}
              {reservation.lastName}
            </Text>

            <Text style={styles.reservationTime}>
              Vandaag om {reservation.time}
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              Bevestigd
            </Text>
          </View>
        </View>

        {/* Details */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Reservatie
          </Text>

          <View style={styles.card}>
            <InfoRow
              label="Aantal personen"
              value={`${reservation.guests} ${
                reservation.guests === 1
                  ? "persoon"
                  : "personen"
              }`}
            />

            <InfoRow
              label="Tijd"
              value={reservation.time}
            />

            <InfoRow
              label="Status"
              value="Bevestigd"
              last
            />
          </View>
        </View>

        {/* Contact */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Contactgegevens
          </Text>

          <View style={styles.card}>
            <InfoRow
              label="Telefoonnummer"
              value={
                reservation.phoneNumber
              }
            />

            <InfoRow
              label="E-mailadres"
              value={reservation.email}
              last
            />
          </View>
        </View>

        {/* Notes */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Opmerking
          </Text>

          <View style={styles.card}>
            <Text
              style={[
                styles.notes,
                !reservation.notes &&
                  styles.emptyNotes,
              ]}
            >
              {reservation.notes ||
                "Geen opmerkingen"}
            </Text>
          </View>
        </View>

        {/* Actions */}

        <View style={styles.actions}>
          <Pressable
            style={styles.primaryButton}
          >
            <Text
              style={styles.primaryButtonText}
            >
              Reservatie wijzigen
            </Text>
          </Pressable>

          <Pressable
            style={styles.cancelButton}
          >
            <Text
              style={styles.cancelButtonText}
            >
              Reservatie annuleren
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  label,
  value,
  last = false,
}) {
  return (
    <View
      style={[
        styles.infoRow,
        !last && styles.infoRowBorder,
      ]}
    >
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
        {value}
      </Text>
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
    paddingBottom: 50,
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
  },

  header: {
    marginBottom: 30,
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

  customerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 36,
  },

  customerName: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111",
  },

  reservationTime: {
    fontSize: 15,
    color: "#777",
    marginTop: 7,
  },

  statusBadge: {
    backgroundColor: "#ededed",
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
  },

  section: {
    marginBottom: 28,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ededed",
    overflow: "hidden",
  },

  infoRow: {
    paddingHorizontal: 18,
    paddingVertical: 17,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#ededed",
  },

  infoLabel: {
    fontSize: 14,
    color: "#777",
  },

  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    textAlign: "right",
    maxWidth: "60%",
  },

  notes: {
    padding: 18,
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
  },

  emptyNotes: {
    color: "#999",
  },

  actions: {
    marginTop: 8,
    gap: 12,
  },

  primaryButton: {
    height: 52,
    borderRadius: 13,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  cancelButton: {
    height: 52,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: "#b42318",
    fontSize: 15,
    fontWeight: "600",
  },

  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  notFoundTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },

  backButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});