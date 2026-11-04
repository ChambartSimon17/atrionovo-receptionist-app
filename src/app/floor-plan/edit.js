import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRouter } from "expo-router";
import {
  Armchair,
  Bath,
  BedDouble,
  ChefHat,
  Circle,
  ConciergeBell,
  Copy,
  DoorOpen,
  Footprints,
  Martini,
  Minus,
  Plus,
  RectangleHorizontal,
  Redo2,
  RotateCw,
  Shirt,
  Sprout,
  Square,
  Thermometer,
  Toilet,
  Trash2,
  Type,
  Undo2,
  Users,
  Wand2,
} from "lucide-react-native";

import { useAuth } from "../../context/auth-context";
import useFloorPlan from "../../hooks/useFloorPlan";
import FloorCanvas from "../../components/floor/FloorCanvas";
import {
  DEFAULT_AREA,
  ELEMENT_TYPES,
  TABLE_PRESETS,
  rotateItem,
  snap,
  temporaryId,
} from "../../components/floor/floor-model";
import {
  Button,
  SegmentedControl,
  SettingsGroup,
  SettingsRow,
  Sheet,
  Stepper,
  Switch,
} from "../../components/ui";
import { t } from "../../i18n";
import { colors, fonts, radius, spacing } from "../../theme";
import { BUSINESS_TYPES } from "../../utils/business-type";

// ======================================================
// Floor plan editor
// ======================================================
//
// One editor for restaurants (tables in rooms such as
// Binnen and Terras) and salons (rooms on floors).
//
//   top       undo, redo, Klaar (saves and closes)
//   tabs      the areas; "+" adds one, a long press
//             renames or deletes it
//   canvas    drag to move, corners to resize
//   bottom    nothing selected: the toolbar to add
//             tables and elements; something selected:
//             its details (name, seats, shape, room…)
//
// Changes stay in the app until Klaar, so undo and redo
// are instant and a save is all or nothing.
// ======================================================

const ICONS = {
  ROUND: Circle,
  SQUARE: Square,
  RECTANGLE: RectangleHorizontal,
  BAR: Martini,
  WALL: Minus,
  DOOR: DoorOpen,
  PLANT: Sprout,
  WINDOW: RectangleHorizontal,
  KITCHEN: ChefHat,
  LABEL: Type,
  ROOM: BedDouble,
  RECEPTION: ConciergeBell,
  WAITING: Armchair,
  CHANGING: Shirt,
  SAUNA: Thermometer,
  SHOWER: Bath,
  STAIRS: Footprints,
  TOILET: Toilet,
  CORRIDOR: Minus,
};

const HISTORY_LIMIT = 50;

function nextTableName(tables) {
  const numbers = tables
    .map((table) => /^T(\d+)$/i.exec(table.name)?.[1])
    .filter(Boolean)
    .map(Number);

  return `T${numbers.length ? Math.max(...numbers) + 1 : 1}`;
}

/**
 * A free spot for a new item: the middle of the area,
 * moved down and right until it overlaps nothing.
 */
function freeSpot(area, items, width, height) {
  let x = snap(area.width / 2 - width / 2);
  let y = snap(area.height / 2 - height / 2);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const overlaps = items.some(
      (item) =>
        x < item.x + item.width + 20 &&
        x + width + 20 > item.x &&
        y < item.y + item.height + 20 &&
        y + height + 20 > item.y
    );

    if (!overlaps) {
      break;
    }

    x = snap((x + width + 40) % Math.max(width + 40, area.width - width));
    if (attempt % 4 === 3) {
      y = snap((y + height + 40) % Math.max(height + 40, area.height - height));
    }
  }

  return { x: Math.max(20, x), y: Math.max(20, y) };
}

export default function FloorPlanEditor() {
  const router = useRouter();
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const { businessType } = useAuth();

  const isMassage = businessType === BUSINESS_TYPES.MASSAGE;
  const isWide = screenWidth >= 900;

  const { plan: loaded, isLoading, error, save } = useFloorPlan();

  const [plan, setPlan] = useState(null);
  const [areaId, setAreaId] = useState(null);
  const [selection, setSelection] = useState(null);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [pickingRoom, setPickingRoom] = useState(false);

  // The plan before the current drag, for undo.
  const dragStart = useRef(null);
  const savedPlan = useRef(null);

  useEffect(() => {
    if (loaded && !plan) {
      setPlan(loaded);
      savedPlan.current = JSON.stringify(loaded);
      setAreaId(loaded.areas[0]?.id ?? null);
    }
  }, [loaded, plan]);

  const isDirty = plan && savedPlan.current !== JSON.stringify(plan);

  // Ask before leaving with unsaved changes.
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (!isDirty || isSaving) {
          return;
        }

        event.preventDefault();

        Alert.alert(t("editor.discardTitle"), t("editor.discardMessage"), [
          { text: t("editor.keepEditing"), style: "cancel" },
          {
            text: t("editor.discard"),
            style: "destructive",
            onPress: () => navigation.dispatch(event.data.action),
          },
        ]);
      }),
    [navigation, isDirty, isSaving]
  );

  const area = plan?.areas.find((candidate) => candidate.id === areaId) ?? plan?.areas[0];

  const areaTables = useMemo(
    () => plan?.tables.filter((table) => table.areaId === area?.id) ?? [],
    [plan, area?.id]
  );
  const areaElements = useMemo(
    () => plan?.elements.filter((element) => element.areaId === area?.id) ?? [],
    [plan, area?.id]
  );

  const selectedItem =
    selection &&
    (selection.kind === "table" ? plan?.tables : plan?.elements)?.find(
      (item) => item.id === selection.id
    );

  // ----------------------------------------------------
  // History
  // ----------------------------------------------------

  function commit(next) {
    setPast((current) => [...current.slice(-HISTORY_LIMIT + 1), plan]);
    setFuture([]);
    setPlan(next);
  }

  function undo() {
    if (past.length === 0) {
      return;
    }

    setFuture((current) => [plan, ...current]);
    setPlan(past[past.length - 1]);
    setPast((current) => current.slice(0, -1));
    setSelection(null);
  }

  function redo() {
    if (future.length === 0) {
      return;
    }

    setPast((current) => [...current, plan]);
    setPlan(future[0]);
    setFuture((current) => current.slice(1));
    setSelection(null);
  }

  // ----------------------------------------------------
  // Items
  // ----------------------------------------------------

  function replaceItem(kind, item, { record = true } = {}) {
    const key = kind === "table" ? "tables" : "elements";
    const next = {
      ...plan,
      [key]: plan[key].map((candidate) => (candidate.id === item.id ? item : candidate)),
    };

    if (record) {
      commit(next);
    } else {
      setPlan(next);
    }
  }

  function updateSelected(changes) {
    replaceItem(selection.kind, { ...selectedItem, ...changes });
  }

  function addTable(presetKey) {
    const preset = TABLE_PRESETS[presetKey];
    const spot = freeSpot(area, [...areaTables, ...areaElements], preset.width, preset.height);
    const table = {
      id: temporaryId("table"),
      areaId: area.id,
      name: nextTableName(plan.tables),
      capacity: preset.capacity,
      shape: preset.shape,
      width: preset.width,
      height: preset.height,
      rotation: 0,
      isOnlineBookable: true,
      ...spot,
    };

    commit({ ...plan, tables: [...plan.tables, table] });
    setSelection({ kind: "table", id: table.id });
  }

  function addElement(type, extra = {}) {
    const defaults = ELEMENT_TYPES[type];
    const spot = freeSpot(area, [...areaTables, ...areaElements], defaults.width, defaults.height);
    const element = {
      id: temporaryId("element"),
      areaId: area.id,
      type,
      label: null,
      width: defaults.width,
      height: defaults.height,
      rotation: 0,
      beds: type === "ROOM" ? 1 : 0,
      treatmentRoomId: null,
      ...spot,
      ...extra,
    };

    commit({ ...plan, elements: [...plan.elements, element] });
    setSelection({ kind: "element", id: element.id });

    return element;
  }

  // Draws every treatment room that is not on the plan
  // yet as a row of rooms.
  function placeRooms() {
    const placed = new Set(plan.elements.map((element) => element.treatmentRoomId).filter(Boolean));
    const missing = plan.rooms.filter((room) => !placed.has(room.id));

    if (missing.length === 0) {
      return;
    }

    const width = 350;
    const height = 400;
    const perRow = Math.max(1, Math.floor((area.width - 40) / width));
    const startY = Math.max(
      0,
      ...areaElements.map((element) => element.y + element.height)
    );

    const rooms = missing.map((room, index) => ({
      id: temporaryId("room"),
      areaId: area.id,
      type: "ROOM",
      label: room.name,
      treatmentRoomId: room.id,
      beds: /duo/i.test(room.name) ? 2 : 1,
      width,
      height,
      rotation: 0,
      x: 20 + (index % perRow) * width,
      y: (startY > 0 ? startY : 20) + Math.floor(index / perRow) * height,
    }));

    const grownArea = {
      ...area,
      width: Math.max(area.width, 40 + Math.min(perRow, rooms.length) * width),
      height: Math.max(area.height, rooms[rooms.length - 1].y + height + 40),
    };

    commit({
      ...plan,
      areas: plan.areas.map((candidate) => (candidate.id === area.id ? grownArea : candidate)),
      elements: [...plan.elements, ...rooms],
    });
  }

  function removeSelected() {
    const key = selection.kind === "table" ? "tables" : "elements";

    commit({ ...plan, [key]: plan[key].filter((item) => item.id !== selection.id) });
    setSelection(null);
  }

  function duplicateSelected() {
    const copy = {
      ...selectedItem,
      id: temporaryId(selection.kind),
      x: snap(selectedItem.x + 40),
      y: snap(selectedItem.y + 40),
      ...(selection.kind === "table" ? { name: nextTableName(plan.tables) } : {}),
      ...(selectedItem.type === "ROOM" ? { treatmentRoomId: null } : {}),
    };
    const key = selection.kind === "table" ? "tables" : "elements";

    commit({ ...plan, [key]: [...plan[key], copy] });
    setSelection({ kind: selection.kind, id: copy.id });
  }

  // ----------------------------------------------------
  // Areas
  // ----------------------------------------------------

  function addArea() {
    const newArea = {
      id: temporaryId("area"),
      name: isMassage
        ? t("editor.floorN", { count: plan.areas.length + 1 })
        : t("editor.roomN", { count: plan.areas.length + 1 }),
      ...DEFAULT_AREA,
    };

    commit({ ...plan, areas: [...plan.areas, newArea] });
    setAreaId(newArea.id);
    setSelection(null);
    setRenaming({ id: newArea.id, name: newArea.name });
  }

  function renameArea() {
    const name = renaming.name.trim();

    if (name) {
      commit({
        ...plan,
        areas: plan.areas.map((candidate) =>
          candidate.id === renaming.id ? { ...candidate, name } : candidate
        ),
      });
    }

    setRenaming(null);
  }

  function deleteArea(id) {
    if (plan.areas.length <= 1) {
      Alert.alert(t("editor.lastAreaTitle"), t("editor.lastAreaMessage"));
      return;
    }

    const tableCount = plan.tables.filter((table) => table.areaId === id).length;

    Alert.alert(
      t("editor.deleteAreaTitle"),
      tableCount > 0 ? t("editor.deleteAreaTables", { count: tableCount }) : t("editor.deleteAreaMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            const remaining = plan.areas.filter((candidate) => candidate.id !== id);
            commit({
              ...plan,
              areas: remaining,
              tables: plan.tables.filter((table) => table.areaId !== id),
              elements: plan.elements.filter((element) => element.areaId !== id),
            });
            setAreaId(remaining[0].id);
            setRenaming(null);
            setSelection(null);
          },
        },
      ]
    );
  }

  // ----------------------------------------------------
  // Save
  // ----------------------------------------------------

  async function handleDone() {
    if (!isDirty) {
      router.back();
      return;
    }

    try {
      setIsSaving(true);
      const saved = await save(plan);
      savedPlan.current = JSON.stringify(saved);
      setPlan(saved);
      router.back();
    } catch (saveError) {
      Alert.alert(t("common.error"), saveError?.message || t("editor.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  // ----------------------------------------------------

  if (isLoading || !plan || !area) {
    return (
      <SafeAreaView style={styles.center}>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </SafeAreaView>
    );
  }

  const toolbar = isMassage
    ? [
        { key: "ROOM", label: t("floor.elements.ROOM"), onPress: () => addElement("ROOM") },
        { key: "DUO", icon: Users, label: t("editor.duoRoom"), onPress: () => addElement("ROOM", { beds: 2, width: 450, label: t("editor.duoRoom") }) },
        ...["RECEPTION", "WAITING", "CHANGING", "SAUNA", "SHOWER", "CORRIDOR", "WALL", "DOOR", "STAIRS", "TOILET", "LABEL"].map((type) => ({
          key: type,
          label: t(`floor.elements.${type}`),
          onPress: () => addElement(type),
        })),
      ]
    : [
        { key: "ROUND", label: t("editor.roundTable"), onPress: () => addTable("ROUND") },
        { key: "SQUARE", label: t("editor.squareTable"), onPress: () => addTable("SQUARE") },
        { key: "RECTANGLE", label: t("editor.longTable"), onPress: () => addTable("RECTANGLE") },
        ...["BAR", "WALL", "DOOR", "WINDOW", "PLANT", "KITCHEN", "TOILET", "LABEL"].map((type) => ({
          key: type,
          label: t(`floor.elements.${type}`),
          onPress: () => addElement(type),
        })),
      ];

  const unplacedRooms = isMassage
    ? plan.rooms.filter(
        (room) => !plan.elements.some((element) => element.treatmentRoomId === room.id)
      )
    : [];

  const linkedRoom =
    selectedItem?.type === "ROOM"
      ? plan.rooms.find((room) => room.id === selectedItem.treatmentRoomId)
      : null;

  const panel = selectedItem ? (
    <View>
      <View style={styles.panelHead}>
        <Text style={styles.panelTitle} numberOfLines={1}>
          {selection.kind === "table"
            ? t("editor.tableTitle", { name: selectedItem.name })
            : selectedItem.label || t(`floor.elements.${selectedItem.type}`)}
        </Text>
        <View style={styles.panelActions}>
          <IconButton icon={RotateCw} label={t("editor.rotate")} onPress={() => updateSelected(rotateItem(selectedItem))} />
          <IconButton icon={Copy} label={t("editor.duplicate")} onPress={duplicateSelected} />
          <IconButton icon={Trash2} label={t("common.delete")} danger onPress={removeSelected} />
        </View>
      </View>

      {selection.kind === "table" ? (
        <SettingsGroup>
          <SettingsRow label={t("editor.name")}>
            <TextInput
              value={selectedItem.name}
              onChangeText={(name) => replaceItem("table", { ...selectedItem, name }, { record: false })}
              onEndEditing={() => commit({ ...plan })}
              style={styles.inlineInput}
              maxLength={20}
            />
          </SettingsRow>
          <SettingsRow label={t("editor.seats")}>
            <Stepper
              value={selectedItem.capacity}
              onChange={(capacity) => updateSelected({ capacity })}
              min={1}
              max={20}
            />
          </SettingsRow>
          <SettingsRow label={t("editor.shape")}>
            <View style={styles.segment}>
              <SegmentedControl
                options={[
                  { value: "ROUND", label: t("editor.round") },
                  { value: "SQUARE", label: t("editor.square") },
                  { value: "RECTANGLE", label: t("editor.long") },
                ]}
                value={selectedItem.shape}
                onChange={(shape) => {
                  const preset = TABLE_PRESETS[shape];
                  updateSelected({
                    shape,
                    width: shape === "RECTANGLE" ? Math.max(selectedItem.width, preset.width) : preset.width,
                    height: preset.height,
                  });
                }}
              />
            </View>
          </SettingsRow>
          <SettingsRow label={t("editor.onlineBookable")} hint={t("editor.onlineBookableHint")}>
            <Switch
              value={selectedItem.isOnlineBookable !== false}
              onValueChange={(isOnlineBookable) => updateSelected({ isOnlineBookable })}
            />
          </SettingsRow>
        </SettingsGroup>
      ) : (
        <SettingsGroup>
          {selectedItem.type !== "WALL" && selectedItem.type !== "DOOR" && selectedItem.type !== "WINDOW" ? (
            <SettingsRow label={t("editor.name")}>
              <TextInput
                value={selectedItem.label ?? ""}
                placeholder={t(`floor.elements.${selectedItem.type}`)}
                placeholderTextColor={colors.textDisabled}
                onChangeText={(label) => replaceItem("element", { ...selectedItem, label }, { record: false })}
                onEndEditing={() => commit({ ...plan })}
                style={styles.inlineInput}
                maxLength={40}
              />
            </SettingsRow>
          ) : null}
          {selectedItem.type === "ROOM" ? (
            <SettingsRow
              label={t("editor.linkedRoom")}
              value={linkedRoom?.name ?? t("editor.notLinked")}
              onPress={() => setPickingRoom(true)}
            />
          ) : null}
          {selectedItem.type === "ROOM" ? (
            <SettingsRow label={t("editor.beds")}>
              <Stepper
                value={selectedItem.beds ?? 1}
                onChange={(beds) => updateSelected({ beds })}
                min={0}
                max={4}
              />
            </SettingsRow>
          ) : null}
          <SettingsRow
            label={t("editor.size")}
            value={`${Math.round(selectedItem.width)} × ${Math.round(selectedItem.height)} cm`}
          />
        </SettingsGroup>
      )}
    </View>
  ) : (
    <View>
      <View style={styles.panelHead}>
        <Text style={styles.panelLabel}>{t("editor.add")}</Text>
        {unplacedRooms.length > 0 ? (
          <Pressable accessibilityRole="button" onPress={placeRooms} style={styles.placeRooms}>
            <Wand2 size={14} color={colors.primary} strokeWidth={2} />
            <Text style={styles.placeRoomsText}>
              {t("editor.placeRooms", { count: unplacedRooms.length })}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tools}
      >
        {toolbar.map((tool) => {
          const Icon = tool.icon ?? ICONS[tool.key] ?? Square;

          return (
            <Pressable
              key={tool.key}
              accessibilityRole="button"
              accessibilityLabel={tool.label}
              onPress={tool.onPress}
              style={({ pressed }) => [styles.tool, pressed && styles.toolPressed]}
            >
              <View style={styles.toolIcon}>
                <Icon size={20} color={colors.text} strokeWidth={1.8} />
              </View>
              <Text style={styles.toolLabel} numberOfLines={1}>
                {tool.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.tip}>{t("editor.tip")}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.topBar}>
        <View style={styles.history}>
          <IconButton icon={Undo2} label={t("editor.undo")} onPress={undo} disabled={past.length === 0} />
          <IconButton icon={Redo2} label={t("editor.redo")} onPress={redo} disabled={future.length === 0} />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {isMassage ? t("editor.titleMassage") : t("editor.title")}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={handleDone}
          disabled={isSaving}
          hitSlop={8}
          style={styles.done}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.doneText}>{isDirty ? t("editor.save") : t("common.done")}</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        style={styles.tabsScroll}
      >
        {plan.areas.map((candidate) => {
          const active = candidate.id === area.id;

          return (
            <Pressable
              key={candidate.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityHint={t("editor.areaHint")}
              onPress={() => {
                setAreaId(candidate.id);
                setSelection(null);
              }}
              onLongPress={() => setRenaming({ id: candidate.id, name: candidate.name })}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{candidate.name}</Text>
            </Pressable>
          );
        })}
        <Pressable accessibilityRole="button" onPress={addArea} style={styles.tabAdd}>
          <Plus size={14} color={colors.primary} strokeWidth={2.2} />
          <Text style={styles.tabAddText}>{isMassage ? t("editor.addFloor") : t("editor.addRoom")}</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.body, isWide && styles.bodyWide]}>
        <View style={styles.canvas}>
          <FloorCanvas
            mode="edit"
            area={area}
            tables={areaTables}
            elements={areaElements}
            selection={selection}
            onSelect={setSelection}
            fitKey={area.id}
            onChange={(kind, item) => {
              if (!dragStart.current) {
                dragStart.current = plan;
              }
              replaceItem(kind, item, { record: false });
            }}
            onChangeEnd={() => {
              if (dragStart.current) {
                setPast((current) => [...current.slice(-HISTORY_LIMIT + 1), dragStart.current]);
                setFuture([]);
                dragStart.current = null;
              }
            }}
          />
        </View>

        <ScrollView
          style={[styles.panel, isWide && styles.panelWide]}
          contentContainerStyle={styles.panelContent}
          keyboardShouldPersistTaps="handled"
        >
          {panel}
        </ScrollView>
      </View>

      <Sheet
        visible={renaming !== null}
        onClose={() => setRenaming(null)}
        title={isMassage ? t("editor.floorName") : t("editor.roomName")}
        footer={
          <>
            <Button variant="primary" label={t("common.save")} onPress={renameArea} />
            <Button
              variant="danger"
              label={t("common.delete")}
              icon={<Trash2 size={16} color={colors.danger} strokeWidth={2} />}
              onPress={() => deleteArea(renaming.id)}
            />
          </>
        }
      >
        <TextInput
          value={renaming?.name ?? ""}
          onChangeText={(name) => setRenaming((current) => ({ ...current, name }))}
          autoFocus
          maxLength={40}
          style={styles.sheetInput}
          returnKeyType="done"
          onSubmitEditing={renameArea}
        />
      </Sheet>

      <Sheet
        visible={pickingRoom}
        onClose={() => setPickingRoom(false)}
        title={t("editor.linkedRoom")}
      >
        <Text style={styles.sheetHint}>{t("editor.linkedRoomHint")}</Text>
        <SettingsGroup>
          {[{ id: null, name: t("editor.notLinked") }, ...plan.rooms].map((room) => {
            const usedBy = room.id
              ? plan.elements.find(
                  (element) => element.treatmentRoomId === room.id && element.id !== selectedItem?.id
                )
              : null;

            return (
              <SettingsRow
                key={room.id ?? "none"}
                label={room.name}
                hint={usedBy ? t("editor.alreadyPlaced") : undefined}
                value={selectedItem?.treatmentRoomId === room.id ? "✓" : ""}
                onPress={() => {
                  updateSelected({
                    treatmentRoomId: room.id,
                    label: room.id ? room.name : selectedItem.label,
                  });
                  setPickingRoom(false);
                }}
              />
            );
          })}
        </SettingsGroup>
      </Sheet>
    </SafeAreaView>
  );
}

function IconButton({ icon: Icon, label, onPress, disabled, danger }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && styles.toolPressed,
        disabled && styles.iconDisabled,
      ]}
    >
      <Icon size={18} color={danger ? colors.danger : colors.text} strokeWidth={1.8} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },

  error: {
    fontFamily: fonts.medium,
    color: colors.danger,
    padding: spacing.xl,
    textAlign: "center",
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  history: {
    flexDirection: "row",
    gap: spacing.xs,
  },

  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },

  done: {
    minWidth: 76,
    alignItems: "flex-end",
  },

  doneText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.primary,
  },

  tabsScroll: {
    flexGrow: 0,
  },

  tabs: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },

  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  tabText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
  },

  tabTextActive: {
    color: colors.onPrimary,
    fontFamily: fonts.semibold,
  },

  tabAdd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.primaryBorder,
  },

  tabAddText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
  },

  body: {
    flex: 1,
  },

  bodyWide: {
    flexDirection: "row",
  },

  canvas: {
    flex: 1,
  },

  panel: {
    flexGrow: 0,
    maxHeight: "46%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
    marginTop: -14,
  },

  panelWide: {
    width: 360,
    maxHeight: "100%",
    marginTop: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
    borderLeftWidth: 1,
  },

  panelContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  panelHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },

  panelTitle: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.text,
  },

  panelLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
  },

  panelActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  placeRooms: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },

  placeRoomsText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
  },

  tools: {
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },

  tool: {
    width: 66,
    alignItems: "center",
    gap: 4,
    borderRadius: radius.md,
    paddingVertical: 2,
  },

  toolPressed: {
    opacity: 0.6,
  },

  toolIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },

  toolLabel: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: colors.textMuted,
    maxWidth: "100%",
  },

  tip: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: "center",
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  iconDisabled: {
    opacity: 0.35,
  },

  inlineInput: {
    flex: 1,
    textAlign: "right",
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing.sm,
  },

  segment: {
    width: 190,
  },

  sheetInput: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
  },

  sheetHint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
});
