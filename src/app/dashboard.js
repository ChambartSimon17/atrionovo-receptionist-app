import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";
import { useAuth } from "../context/auth-context";

export default function Dashboard() {
  const router = useRouter();

  const {
    user,
    restaurant,
    logout,
  } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>
        AtrioNovo
      </Text>

      <Text style={styles.greeting}>
        Welkom, {user?.firstName}
      </Text>

      <Text style={styles.restaurant}>
        {restaurant?.name}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Reservaties vandaag
        </Text>

        <Text style={styles.number}>
          0
        </Text>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>
          Uitloggen
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    padding: 24,
    paddingTop: 70,
  },

  logo: {
    fontSize: 18,
    fontWeight: "700",
  },

  greeting: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 40,
  },

  restaurant: {
    fontSize: 17,
    color: "#666",
    marginTop: 6,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    marginTop: 32,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },

  number: {
    fontSize: 42,
    fontWeight: "700",
    marginTop: 12,
  },

  logoutButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },

  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
});