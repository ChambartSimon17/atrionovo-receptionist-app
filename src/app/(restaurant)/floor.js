import {
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Check,
  PencilRuler,
  Plus,
  X,
} from "lucide-react-native";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";
import DayNavigation from "../../components/DayNavigation";
import ReservationRow from "../../components/ReservationRow";
import TableMap from "../../components/TableMap";
import { getTableReservationState } from "../../components/table-state";
import {
  Button,
  Card,
  SegmentedControl,
} from "../../components/ui";
import useRestaurantDay from "../../hooks/useRestaurantDay";
import {
  colors,
  fonts,
  radius,
  spacing,
  tableColors,
  type,
} from "../../theme";
import { todayString } from "../../utils/date";

// ======================================================
// Zaal (live floor plan)
// ======================================================
//
// The floor plan of the chosen day with every table
// coloured by its state. Tapping a table shows who sits
// there or comes next, with the buttons to seat them or
// let them leave.
//
// "Bewerk vloerplan" switches to editing: drag the
// tables, add one, or tap one to change its name, size,
// shape and number of seats, or to deactivate it.
// ======================================================

const LEGEND = [
  { state: "AVAILABLE", label: "Vrij" },
  { state: "RESERVED", label: "Gereserveerd" },
  { state: "ARRIVING", label: "Komt nu" },
  { state: "SEATED", label: "Bezet" },
];

const SHAPES = [
  { value: "ROUND", label: "Rond" },
  { value: "SQUARE", label: "Vierkant" },
  { value: "RECTANGLE", label: "Rechthoek" },
];

const STATE_LABELS = {
  AVAILABLE: "Vrij",
  RESERVED: "Gereserveerd",
  ARRIVING: "Gasten komen nu",
  SEATED: "Bezet",
};

export default function RestaurantFloorScreen() {
  const router = useRouter();

  const { business, accessToken } = useAuth();

  const [date, setDate] = useState(todayString());
  const [selectedId, setSelectedId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const scrollRef = useRef(null);

  const {
    reservations,
    tables,
    setTables,
    isLoading,
    error,
    seat,
    complete,
    actionId,
  } = useRestaurantDay(date);

  const now = new Date();
  const isToday = date === todayString();

  // Outside today the map shows the day as planned.
  const stateTime = isToday ? now : new Date(`${date}T00:00:00`);

  const counts = tables.reduce((result, table) => {
    const state = getTableReservationState(
      table,
      reservations,
      stateTime
    );
    result[state] = (result[state] ?? 0) + 1;
    return result;
  }, {});

  const selectedTable = tables.find(
    (table) => table.id === selectedId
  );

  const selectedReservations = selectedTable
    ? reservations.filter((reservation) =>
        reservation.tables?.some(
          (reservationTable) =>
            reservationTable.tableId === selectedTable.id
        )
      )
    : [];

  function selectTable(table) {
    setSelectedId(table.id);

    // The panel sits under the map; bring it into view.
    setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      50
    );

    if (isEditing) {
      setDraft({
        id: table.id,
        name: table.name,
        capacity: String(table.capacity),
        width: String(Math.round(table.width)),
        height: String(Math.round(table.height)),
        shape: table.shape,
      });
    }
  }

  function toggleEditing() {
    setIsEditing((current) => !current);
    setSelectedId(null);
    setDraft(null);
  }

  async function moveTable(tableId, position) {
    setTables((current) =>
      current.map((table) =>
        table.id === tableId ? { ...table, ...position } : table
      )
    );

    try {
      await api.updateTable(
        business.id,
        tableId,
        position,
        accessToken
      );
    } catch (moveError) {
      Alert.alert(
        "Niet opgeslagen",
        moveError?.message ||
          "De tafelpositie kon niet worden opgeslagen."
      );
    }
  }

  async function addTable() {
    const names = new Set(tables.map((table) => table.name));
    let number = 1;

    while (names.has(`Tafel ${number}`)) {
      number += 1;
    }

    try {
      const response = await api.createTable(
        business.id,
        {
          name: `Tafel ${number}`,
          capacity: 2,
          shape: "ROUND",
          x: 24,
          y: 24,
          width: 70,
          height: 70,
          rotation: 0,
          isActive: true,
        },
        accessToken
      );
      const created = response?.data || response;

      setTables((current) => [...current, created]);
      selectTable(created);
    } catch (addError) {
      Alert.alert(
        "Niet gelukt",
        addError?.message ||
          "De tafel kon niet worden toegevoegd."
      );
    }
  }

  async function saveDraft() {
    const capacity = Number(draft.capacity);
    const width = Number(draft.width);
    const height = Number(draft.height);

    if (!draft.name.trim()) {
      Alert.alert("Ongeldig", "Geef de tafel een naam.");
      return;
    }

    if (!Number.isInteger(capacity) || capacity <= 0) {
      Alert.alert(
        "Ongeldig",
        "Het aantal plaatsen moet een positief geheel getal zijn."
      );
      return;
    }

    if (
      !Number.isFinite(width) ||
      width <= 0 ||
      !Number.isFinite(height) ||
      height <= 0
    ) {
      Alert.alert(
        "Ongeldig",
        "Breedte en hoogte moeten groter zijn dan nul."
      );
      return;
    }

    try {
      setIsSaving(true);

      const updates = {
        name: draft.name.trim(),
        capacity,
        shape: draft.shape,
        width,
        height,
      };

      const response = await api.updateTable(
        business.id,
        draft.id,
        updates,
        accessToken
      );
      const updated = response?.data || response;

      setTables((current) =>
        current.map((table) =>
          table.id === draft.id
            ? { ...table, ...updates, ...updated }
            : table
        )
      );
      setDraft(null);
      setSelectedId(null);
    } catch (saveError) {
      Alert.alert(
        "Niet opgeslagen",
        saveError?.message ||
          "De tafel kon niet worden bijgewerkt."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDeactivate() {
    Alert.alert(
      "Tafel deactiveren?",
      `Weet je zeker dat je ${draft.name} wilt deactiveren? Bestaande reservaties blijven bewaard.`,
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Deactiveren",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteTable(
                business.id,
                draft.id,
                accessToken
              );
              setTables((current) =>
                current.filter(
                  (table) => table.id !== draft.id
                )
              );
              setDraft(null);
              setSelectedId(null);
            } catch (deleteError) {
              Alert.alert(
                "Niet gelukt",
                deleteError?.message ||
                  "De tafel kon niet worden gedeactiveerd."
              );
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <Text style={type.title}>Zaal</Text>
            <Text style={type.caption}>
              {tables.length === 1
                ? "1 tafel"
                : `${tables.length} tafels`}
              {" · "}
              {tables.reduce(
                (sum, table) => sum + (table.capacity ?? 0),
                0
              )}{" "}
              plaatsen
            </Text>
          </View>
          <Button
            label={isEditing ? "Klaar" : "Bewerk vloerplan"}
            variant={isEditing ? "primary" : "secondary"}
            onPress={toggleEditing}
            icon={
              isEditing ? (
                <Check
                  size={16}
                  color={colors.onPrimary}
                  strokeWidth={2}
                />
              ) : (
                <PencilRuler
                  size={16}
                  color={colors.text}
                  strokeWidth={1.8}
                />
              )
            }
          />
        </View>

        {!isEditing && (
          <DayNavigation
            date={date}
            onChange={(nextDate) => {
              setDate(nextDate);
              setSelectedId(null);
            }}
          />
        )}

        {/* Legend */}

        {isEditing ? (
          <View style={styles.editHint}>
            <Text style={styles.editHintText}>
              Sleep een tafel om ze te verplaatsen, tik om
              ze aan te passen.
            </Text>
            <Button
              label="Tafel"
              onPress={addTable}
              icon={
                <Plus
                  size={16}
                  color={colors.text}
                  strokeWidth={2}
                />
              }
            />
          </View>
        ) : (
          <View style={styles.legend}>
            {LEGEND.map((item) => (
              <View key={item.state} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    {
                      backgroundColor:
                        tableColors[item.state].background,
                      borderColor: tableColors[item.state].border,
                    },
                  ]}
                />
                <Text style={styles.legendText}>
                  {item.label}
                </Text>
                <Text style={styles.legendCount}>
                  {counts[item.state] ?? 0}
                </Text>
              </View>
            ))}
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator
            color={colors.primary}
            style={styles.loading}
          />
        ) : error ? (
          <Card>
            <Text style={styles.error}>{error}</Text>
          </Card>
        ) : (
          <TableMap
            tables={tables}
            reservations={reservations}
            isEditing={isEditing}
            selectedTableId={selectedId}
            currentTime={stateTime}
            onTableSelect={selectTable}
            onTablePositionChange={moveTable}
          />
        )}

        {/* Selected table */}

        {!isEditing && selectedTable && (
          <Card style={styles.panel}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={type.heading}>
                  {selectedTable.name}
                </Text>
                <Text style={type.caption}>
                  {selectedTable.capacity} plaatsen ·{" "}
                  {
                    STATE_LABELS[
                      getTableReservationState(
                        selectedTable,
                        reservations,
                        stateTime
                      )
                    ]
                  }
                </Text>
              </View>
              <CloseButton onPress={() => setSelectedId(null)} />
            </View>

            {selectedReservations.length === 0 ? (
              <Text style={styles.panelEmpty}>
                Geen reservaties aan deze tafel{" "}
                {isToday ? "vandaag" : "deze dag"}.
              </Text>
            ) : (
              selectedReservations.map((reservation, index) => (
                <ReservationRow
                  key={reservation.id}
                  reservation={reservation}
                  tables={tables}
                  divider={index > 0}
                  showActions={isToday}
                  now={now}
                  busy={actionId === reservation.id}
                  onPress={() =>
                    router.push(`/reservation/${reservation.id}`)
                  }
                  onSeat={seat}
                  onComplete={complete}
                />
              ))
            )}
          </Card>
        )}

        {/* Table editor */}

        {isEditing && draft && (
          <Card style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={type.heading}>Tafel aanpassen</Text>
              <CloseButton
                onPress={() => {
                  setDraft(null);
                  setSelectedId(null);
                }}
              />
            </View>

            <Field label="Naam">
              <TextInput
                value={draft.name}
                onChangeText={(name) =>
                  setDraft((current) => ({ ...current, name }))
                }
                style={styles.input}
              />
            </Field>

            <View style={styles.fieldRow}>
              <Field label="Plaatsen" style={styles.fieldItem}>
                <TextInput
                  value={draft.capacity}
                  onChangeText={(capacity) =>
                    setDraft((current) => ({
                      ...current,
                      capacity,
                    }))
                  }
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </Field>
              <Field label="Breedte" style={styles.fieldItem}>
                <TextInput
                  value={draft.width}
                  onChangeText={(width) =>
                    setDraft((current) => ({
                      ...current,
                      width,
                    }))
                  }
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </Field>
              <Field label="Hoogte" style={styles.fieldItem}>
                <TextInput
                  value={draft.height}
                  onChangeText={(height) =>
                    setDraft((current) => ({
                      ...current,
                      height,
                    }))
                  }
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </Field>
            </View>

            <Field label="Vorm">
              <SegmentedControl
                options={SHAPES}
                value={draft.shape}
                onChange={(shape) =>
                  setDraft((current) => ({ ...current, shape }))
                }
              />
            </Field>

            <Button
              label="Opslaan"
              variant="primary"
              loading={isSaving}
              onPress={saveDraft}
            />
            <Button
              label="Tafel deactiveren"
              variant="danger"
              onPress={confirmDeactivate}
            />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, style, children }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function CloseButton({ onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sluiten"
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => [
        styles.close,
        pressed && styles.closePressed,
      ]}
    >
      <X size={18} color={colors.textMuted} strokeWidth={1.8} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  titleText: {
    flex: 1,
    gap: 2,
  },

  // Legend

  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: spacing.md,
    rowGap: spacing.xs,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },

  legendText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.text,
  },

  legendCount: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
  },

  editHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  editHintText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },

  loading: {
    marginTop: spacing.xxl,
  },

  error: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
  },

  // Panels

  panel: {
    gap: spacing.md,
  },

  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  panelEmpty: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },

  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -4,
    marginRight: -6,
  },

  closePressed: {
    backgroundColor: colors.surfaceMuted,
  },

  field: {
    gap: 6,
  },

  fieldRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  fieldItem: {
    flex: 1,
  },

  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },

  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
});
