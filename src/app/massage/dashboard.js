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

// ======================================================
// Massage dashboard
// ======================================================
//
// Home screen of a massage business. Appointments,
// therapists and treatment rooms are added in the next
// phases; for now the owner can manage services and
// opening hours from here.
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Afspraken van vandaag
          </Text>

          <Text style={styles.cardText}>
            Hier verschijnen binnenkort je afspraken.
            Stel eerst je massages en prijzen in, zodat
            klanten ze kunnen boeken.
          </Text>
        </View>

        <MenuButton
          title="Massages en prijzen"
          description="Beheer je aanbod, duur en prijs"
          onPress={() =>
            router.push("/massage/services")
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

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
    marginBottom: 6,
  },

  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#666",
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
