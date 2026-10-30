import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAuth } from "../../context/auth-context";
import MassageAgenda from "../../components/MassageAgenda";

// ======================================================
// Massage dashboard
// ======================================================
//
// Home screen of a massage business: the agenda of the
// day with a button for a new appointment, and the menu
// for massages, therapists, rooms and settings.
// ======================================================

export default function MassageDashboardScreen() {
  const router = useRouter();

  const { user, business, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>AtrioNovo</Text>

          <Text style={styles.greeting}>
            Welkom, {user?.firstName || "gebruiker"}
          </Text>

          <Text style={styles.businessName}>
            {business?.name || ""}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.newButton}
          onPress={() =>
            router.push("/massage/new-appointment")
          }
        >
          <Text style={styles.newButtonText}>
            Nieuwe afspraak
          </Text>
        </TouchableOpacity>

        <MassageAgenda />

        <MenuButton
          title="Massages en prijzen"
          description="Beheer je aanbod, duur en prijs"
          onPress={() =>
            router.push("/massage/services")
          }
        />

        <MenuButton
          title="Therapeuten"
          description="Wie welke massages geeft en wanneer"
          onPress={() =>
            router.push("/massage/therapists")
          }
        />

        <MenuButton
          title="Behandelkamers"
          description="Kamers en welke massages erin kunnen"
          onPress={() =>
            router.push("/massage/rooms")
          }
        />

        <MenuButton
          title="Instellingen"
          description="Openingstijden en speciale dagen"
          onPress={() =>
            router.push("/massage/settings")
          }
        />

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await logout();

            router.replace("/login");
          }}
        >
          <Text style={styles.logoutText}>
            Uitloggen
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuButton({
  title,
  description,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.menuButton}
      onPress={onPress}
    >
      <View style={styles.menuTextBlock}>
        <Text style={styles.menuTitle}>{title}</Text>

        <Text style={styles.menuDescription}>
          {description}
        </Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
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

  header: {
    alignItems: "center",
    marginBottom: 28,
  },

  logo: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111",
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
    marginTop: 6,
  },

  newButton: {
    backgroundColor: "#111",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },

  newButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  menuButton: {
    minHeight: 80,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  menuTextBlock: {
    flex: 1,
  },

  menuTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
  },

  menuDescription: {
    fontSize: 14,
    color: "#666",
  },

  arrow: {
    fontSize: 28,
    color: "#888",
  },

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
