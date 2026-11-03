import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "../../../context/auth-context";
import MassageAgenda from "../../../components/MassageAgenda";
import {
  addDays,
  formatLongDate,
  todayString,
} from "../../../utils/date";

// ======================================================
// Massage dashboard
// ======================================================
//
// Home screen of a massage business, built like the
// restaurant dashboard: four buttons at the top (new
// appointment, calendar, customers, settings), the day
// navigation and the agenda of the selected day.
//
// The calendar opens this screen with a ?date=YYYY-MM-DD
// parameter to show another day.
//
// Massages, therapists, rooms and opening hours live in
// the settings.
// ======================================================

function isValidDateParam(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  );
}

export default function MassageDashboardScreen() {
  const router = useRouter();

  const { user, business, logout } = useAuth();

  const { date: dateParam } = useLocalSearchParams();

  const { width } = useWindowDimensions();

  const isLandscape = width > 700;

  const [date, setDate] = useState(() =>
    isValidDateParam(dateParam)
      ? dateParam
      : todayString()
  );

  const [total, setTotal] = useState(0);

  // Follow the day chosen in the calendar.
  useEffect(() => {
    if (isValidDateParam(dateParam)) {
      setDate(dateParam);
    }
  }, [dateParam]);

  const isToday = date === todayString();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isLandscape && styles.contentLandscape,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}

        <View style={styles.header}>
          <Text style={styles.logo}>AtrioNovo</Text>

          <Text style={styles.greeting}>
            Welkom, {user?.firstName || "gebruiker"}
          </Text>

          <Text style={styles.businessName}>
            {business?.name || ""}
          </Text>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.addButton}
              activeOpacity={0.8}
              accessibilityLabel="Nieuwe afspraak"
              onPress={() =>
                router.push("/massage/new-appointment")
              }
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.calendarButton}
              activeOpacity={0.7}
              accessibilityLabel="Kalender"
              onPress={() => router.push("/calendar")}
            >
              <Text style={styles.calendarIcon}>▦</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.crmButton}
              activeOpacity={0.7}
              accessibilityLabel="Klanten"
              onPress={() => router.push("/customers")}
            >
              <Text style={styles.crmButtonText}>CRM</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingsButton}
              activeOpacity={0.7}
              accessibilityLabel="Instellingen"
              onPress={() =>
                router.push("/massage/settings")
              }
            >
              <Text style={styles.settingsIcon}>⚙</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Day navigation */}

        <View style={styles.dateNavigation}>
          <TouchableOpacity
            style={styles.dateNavigationButton}
            activeOpacity={0.7}
            accessibilityLabel="Vorige dag"
            onPress={() =>
              setDate((current) => addDays(current, -1))
            }
          >
            <Text style={styles.dateNavigationArrow}>‹</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selectedDateContainer}
            activeOpacity={0.7}
            disabled={isToday}
            onPress={() => setDate(todayString())}
          >
            <Text style={styles.date}>
              {formatLongDate(date)}
            </Text>

            <Text style={styles.dateSubtitle}>
              {isToday ? "Vandaag" : "Tik voor vandaag"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateNavigationButton}
            activeOpacity={0.7}
            accessibilityLabel="Volgende dag"
            onPress={() =>
              setDate((current) => addDays(current, 1))
            }
          >
            <Text style={styles.dateNavigationArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Total */}

        <View style={styles.dateTotalRow}>
          <Text style={styles.selectedDateLabel}>
            {isToday ? "Vandaag" : "Geselecteerde dag"}
          </Text>

          <View style={styles.totalContainer}>
            <Text style={styles.totalNumber}>{total}</Text>

            <Text style={styles.totalLabel}>
              {total === 1 ? "afspraak" : "afspraken"}
            </Text>
          </View>
        </View>

        {/* Agenda */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Afspraken</Text>
        </View>

        <MassageAgenda
          date={date}
          onCountChange={setTotal}
        />

        {/* Logout */}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await logout();

            router.replace("/login");
          }}
        >
          <Text style={styles.logoutText}>Uitloggen</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },

  contentLandscape: {
    paddingHorizontal: 40,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
  },

  // Header

  header: {
    alignItems: "center",
    width: "100%",
  },

  logo: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },

  greeting: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111",
    marginTop: 34,
  },

  businessName: {
    fontSize: 17,
    color: "#666",
    marginTop: 5,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    width: "100%",
    gap: 10,
  },

  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#087FE5",
    alignItems: "center",
    justifyContent: "center",
  },

  addButtonText: {
    fontSize: 28,
    fontWeight: "400",
    color: "#fff",
    lineHeight: 30,
  },

  calendarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  calendarIcon: {
    fontSize: 25,
    color: "#111",
  },

  crmButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },

  crmButtonText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "#fff",
  },

  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#087FE5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },

  settingsIcon: {
    fontSize: 25,
    color: "#fff",
  },

  // Day navigation

  dateNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 34,
  },

  dateNavigationButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  dateNavigationArrow: {
    fontSize: 34,
    lineHeight: 36,
    color: "#111",
    marginTop: -3,
  },

  selectedDateContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
  },

  date: {
    fontSize: 21,
    fontWeight: "700",
    color: "#111",
    textTransform: "capitalize",
    textAlign: "center",
  },

  dateSubtitle: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },

  // Total

  dateTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },

  selectedDateLabel: {
    fontSize: 14,
    color: "#777",
  },

  totalContainer: {
    alignItems: "flex-end",
  },

  totalNumber: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111",
  },

  totalLabel: {
    fontSize: 13,
    color: "#777",
  },

  // Agenda

  sectionHeader: {
    marginTop: 28,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },

  // Logout

  logoutButton: {
    backgroundColor: "#111",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },

  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
