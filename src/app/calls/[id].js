import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import CallDetail from "../../components/CallDetail";
import { ScreenHeader } from "../../components/ui";
import { t } from "../../i18n";
import { colors, spacing } from "../../theme";

// ======================================================
// One call
// ======================================================
//
// The call screen on a phone. The content itself lives in
// CallDetail, which a tablet in landscape shows next to
// the call list instead.
// ======================================================

export default function CallScreen() {
  const { id } = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <ScreenHeader title={t("calls.callTitle")} />
      </View>

      <CallDetail callId={id} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    paddingHorizontal: spacing.xl,
  },
});
