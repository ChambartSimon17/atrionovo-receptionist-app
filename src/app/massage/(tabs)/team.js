import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SegmentedControl } from "../../../components/ui";
import ScheduleView from "../../../components/team/ScheduleView";
import AttendanceView from "../../../components/team/AttendanceView";
import { t } from "../../../i18n";
import { colors, spacing, type } from "../../../theme";

// ======================================================
// Team (salon)
// ======================================================
//
// Rooster: the week of every therapist, other hours on a
// date, absences (only the owner reports them).
// Aanwezigheid: the time clock, compared with the
// schedule.
// ======================================================

export default function TeamScreen() {
  const [view, setView] = useState("schedule");

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={type.title}>{t("team.title")}</Text>
        </View>

        <SegmentedControl
          options={[
            { value: "schedule", label: t("team.schedule") },
            { value: "attendance", label: t("team.attendance") },
          ]}
          value={view}
          onChange={setView}
        />

        {view === "schedule" ? <ScheduleView /> : <AttendanceView />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 48,
    gap: spacing.lg,
  },

  header: {
    gap: spacing.xs,
  },
});
