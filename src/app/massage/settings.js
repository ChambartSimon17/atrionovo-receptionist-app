import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

// ======================================================
// Massage settings
// ======================================================
//
// Opening hours and special opening days are shared with
// restaurants. Restaurant-only settings (capacity, tables)
// are not shown here.
// ======================================================

export default function MassageSettingsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Instellingen</Text>

      <Option
        title="Openingstijden"
        description="Wekelijkse openingstijden aanpassen"
        onPress={() =>
          router.push("/settings/opening-hours")
        }
      />

      <Option
        title="Speciale openingsdagen"
        description="Feestdagen en uitzonderlijke openingsuren"
        onPress={() =>
          router.push("/settings/special-opening-days")
        }
      />
    </View>
  );
}

function Option({ title, description, onPress }) {
  return (
    <Pressable style={styles.option} onPress={onPress}>
      <View>
        <Text style={styles.optionTitle}>{title}</Text>

        <Text style={styles.optionDescription}>
          {description}
        </Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </Pressable>
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
