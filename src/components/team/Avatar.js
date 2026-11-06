import { StyleSheet, Text, View } from "react-native";

import { fonts } from "../../theme";
import { avatarColors } from "./team-format";

// A round avatar with the first letter of a name, in the
// colour of the therapist's position in the team.
export default function Avatar({ name, index = 0, size = 34 }) {
  const palette = avatarColors(index);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.background,
        },
      ]}
    >
      <Text style={[styles.letter, { color: palette.text, fontSize: Math.round(size * 0.38) }]}>
        {(name ?? "?").charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },

  letter: {
    fontFamily: fonts.semibold,
  },
});
