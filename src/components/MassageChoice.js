import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// ======================================================
// MassageChoice
// ======================================================
//
// Lets the owner pick which massages a therapist can
// perform or which massages can take place in a room.
// The selected massages are highlighted.
// ======================================================

export default function MassageChoice({
  services,
  selectedIds,
  onChange,
}) {
  if (services.length === 0) {
    return (
      <Text style={styles.empty}>
        Je hebt nog geen massages. Voeg ze eerst toe
        bij "Massages en prijzen".
      </Text>
    );
  }

  function toggle(id) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((value) => value !== id)
        : [...selectedIds, id]
    );
  }

  return (
    <View style={styles.wrap}>
      {services.map((service) => {
        const selected = selectedIds.includes(
          service.id
        );

        return (
          <Pressable
            key={service.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            style={[
              styles.chip,
              selected && styles.chipSelected,
            ]}
            onPress={() => toggle(service.id)}
          >
            <Text
              style={[
                styles.chipText,
                selected && styles.chipTextSelected,
              ]}
            >
              {service.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },

  chipSelected: {
    backgroundColor: "#111",
    borderColor: "#111",
  },

  chipText: {
    fontSize: 14,
    color: "#111",
  },

  chipTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },

  empty: {
    fontSize: 14,
    color: "#888",
  },
});
