import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Instellingen
      </Text>

      <Pressable
        style={styles.option}
        onPress={() =>
          router.push("/settings/restaurant")
        }
      >
        <View>
          <Text style={styles.optionTitle}>
            Restaurant
          </Text>

          <Text style={styles.optionDescription}>
            Restaurantgegevens en capaciteit
          </Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <Pressable
        style={styles.option}
        onPress={() =>
          router.push("/settings/opening-hours")
        }
      >
        <View>
          <Text style={styles.optionTitle}>
            Openingstijden
          </Text>

          <Text style={styles.optionDescription}>
            Wekelijkse openingstijden aanpassen
          </Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <Pressable
        style={styles.option}
        onPress={() =>
          router.push(
            "/settings/special-opening-days"
          )
        }
      >
        <View>
          <Text style={styles.optionTitle}>
            Speciale openingsdagen
          </Text>

          <Text style={styles.optionDescription}>
            Feestdagen en uitzonderlijke openingsuren
          </Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
  },

  option: {
    minHeight: 80,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  optionTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },

  optionDescription: {
    fontSize: 14,
    color: "#666",
  },

  arrow: {
    fontSize: 28,
    color: "#888",
  },
});