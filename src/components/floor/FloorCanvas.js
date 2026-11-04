import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { Maximize2, Minus, Plus } from "lucide-react-native";

import { floorColors, fonts, radius } from "../../theme";
import { formatTime } from "../../utils/date";
import { t } from "../../i18n";
import {
  ELEMENT_TYPES,
  chairPositions,
  contentBounds,
  handleAt,
  handlePositions,
  itemAt,
  moveItem,
  resizeItem,
} from "./floor-model";

// ======================================================
// FloorCanvas
// ======================================================
//
// Draws one area of the floor plan, like an architect's
// drawing: a dark floor, walls, doors and windows, light
// tables with their chairs, and for salons the rooms.
//
// view  tap a table or room to select it; drag with one
//       finger to move the plan, pinch to zoom
// edit  drag an item to move it, drag a white corner to
//       resize it, drag the empty floor to move the plan
//
// Shapes are drawn in centimetres and scaled; the labels
// are drawn on top in screen pixels, so they stay
// readable at any zoom.
//
// Props
//   area, tables, elements
//   mode               "view" | "edit"
//   tableStates        { [tableId]: tableLiveState() }
//   roomStates         { [elementId]: roomLiveState() }
//   selection          { kind: "table" | "element", id }
//   onSelect(selection | null)
//   onChange(kind, item)     while dragging (edit)
//   onChangeEnd()            after a drag (edit)
//   highlightIds       tables to ring, e.g. free tables
//                      while assigning a reservation
//   fitKey             refit the plan when it changes
// ======================================================

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 5;
const HANDLE_PX = 11;

const STATE_COLORS = {
  free: floorColors.free,
  reserved: floorColors.reserved,
  arriving: floorColors.arriving,
  late: floorColors.late,
  seated: floorColors.seated,
};

const ROOM_STATE_COLORS = {
  free: floorColors.free,
  busy: floorColors.seated,
  soon: floorColors.arriving,
  cleaning: floorColors.cleaning,
};

function shortName(reservation) {
  const name =
    reservation.source === "WALK_IN" && !reservation.lastName
      ? t("floor.walkIn")
      : reservation.lastName || reservation.firstName || "";

  return name.length > 11 ? `${name.slice(0, 10)}…` : name;
}

function itemTransform(item) {
  return `translate(${item.x} ${item.y}) rotate(${item.rotation || 0} ${item.width / 2} ${item.height / 2})`;
}

function TableShape({ table, colors, dimmed }) {
  const chairs = chairPositions(table);

  return (
    <G transform={itemTransform(table)} opacity={dimmed ? 0.45 : 1}>
      {chairs.map((chair, index) => (
        <Rect
          key={index}
          x={chair.x - 17}
          y={chair.y - 9}
          width={34}
          height={18}
          rx={7}
          fill={colors.chair}
          transform={`rotate(${chair.angle} ${chair.x} ${chair.y})`}
        />
      ))}
      {table.shape === "ROUND" ? (
        <Ellipse
          cx={table.width / 2}
          cy={table.height / 2}
          rx={table.width / 2}
          ry={table.height / 2}
          fill={colors.fill}
        />
      ) : (
        <Rect width={table.width} height={table.height} rx={9} fill={colors.fill} />
      )}
    </G>
  );
}

function ElementShape({ element, roomState }) {
  const { width: w, height: h } = element;
  const info = ELEMENT_TYPES[element.type] ?? {};

  let body = null;

  switch (element.type) {
    case "WALL":
      body = <Rect width={w} height={h} fill={floorColors.wall} />;
      break;

    case "WINDOW":
      body = (
        <>
          <Rect width={w} height={h} fill={floorColors.canvas} />
          <Rect y={h / 2 - 3} width={w} height={6} fill={floorColors.window} />
        </>
      );
      break;

    case "DOOR":
      body = (
        <>
          {/* The opening cut out of the wall below. */}
          <Rect x={0} y={h - 7} width={w} height={14} fill={floorColors.canvas} />
          <Line x1={0} y1={h} x2={0} y2={0} stroke={floorColors.door} strokeWidth={5} />
          <Path
            d={`M0 0 A${w} ${h} 0 0 1 ${w} ${h}`}
            fill="none"
            stroke={floorColors.door}
            strokeWidth={2}
            strokeDasharray="8 7"
          />
        </>
      );
      break;

    case "BAR":
      body = (
        <Rect
          width={w}
          height={h}
          rx={10}
          fill={floorColors.decor}
          stroke={floorColors.decorBorder}
          strokeWidth={3}
        />
      );
      break;

    case "PLANT":
      body = (
        <>
          <Circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2} fill={floorColors.plant} />
          <Circle cx={w * 0.38} cy={h * 0.4} r={Math.min(w, h) / 4.5} fill={floorColors.plantLeaf} />
          <Circle cx={w * 0.64} cy={h * 0.6} r={Math.min(w, h) / 6} fill={floorColors.plantLeaf} />
        </>
      );
      break;

    case "STAIRS":
      body = (
        <>
          <Rect width={w} height={h} fill={floorColors.area} stroke={floorColors.wall} strokeWidth={3} />
          {Array.from({ length: Math.max(3, Math.floor(Math.max(w, h) / 28)) }, (_, index, all) => {
            const along = ((index + 1) / (all.length + 1)) * (h >= w ? h : w);

            return h >= w ? (
              <Line key={index} x1={0} y1={along} x2={w} y2={along} stroke={floorColors.decorBorder} strokeWidth={2} />
            ) : (
              <Line key={index} x1={along} y1={0} x2={along} y2={h} stroke={floorColors.decorBorder} strokeWidth={2} />
            );
          })}
        </>
      );
      break;

    case "LABEL":
      body = null;
      break;

    case "ROOM": {
      const colors = ROOM_STATE_COLORS[roomState?.state] ?? floorColors.free;
      const beds = Math.max(0, Math.min(4, element.beds ?? 1));

      body = (
        <>
          <Rect width={w} height={h} fill={colors.fill} stroke={floorColors.wall} strokeWidth={8} />
          {roomState?.state === "cleaning"
            ? Array.from({ length: Math.ceil((w + h) / 40) }, (_, index) => (
                <Line
                  key={index}
                  x1={Math.max(0, index * 40 - h)}
                  y1={Math.min(h, index * 40)}
                  x2={Math.min(w, index * 40)}
                  y2={Math.max(0, index * 40 - w)}
                  stroke={floorColors.cleaning.chair}
                  strokeWidth={3}
                />
              ))
            : null}
          {Array.from({ length: beds }, (_, index) => {
            const bedWidth = 75;
            const bedHeight = Math.min(195, h * 0.55);
            const spacing = w / (beds + 1);
            const x = spacing * (index + 1) - bedWidth / 2;
            const y = h / 2 - bedHeight / 2 + h * 0.08;

            return (
              <G key={index}>
                <Rect
                  x={x}
                  y={y}
                  width={bedWidth}
                  height={bedHeight}
                  rx={14}
                  fill="none"
                  stroke={colors.chair}
                  strokeWidth={4}
                />
                <Rect x={x + 14} y={y + 12} width={bedWidth - 28} height={26} rx={8} fill={colors.chair} />
              </G>
            );
          })}
        </>
      );
      break;
    }

    default:
      if (info.room) {
        body = (
          <Rect
            width={w}
            height={h}
            fill={floorColors.area}
            stroke={floorColors.wall}
            strokeWidth={element.type === "CORRIDOR" ? 3 : 8}
          />
        );
      }
  }

  return <G transform={itemTransform(element)}>{body}</G>;
}

function elementLabel(element) {
  if (element.label) {
    return element.label;
  }

  return t(`floor.elements.${element.type}`);
}

export default function FloorCanvas({
  area,
  tables = [],
  elements = [],
  mode = "view",
  tableStates = {},
  roomStates = {},
  selection = null,
  onSelect,
  onChange,
  onChangeEnd,
  highlightIds,
  fitKey,
}) {
  const [size, setSize] = useState(null);
  const [view, setView] = useState(null);
  const [dragInfo, setDragInfo] = useState(null);

  const isEdit = mode === "edit";

  // The latest values for the gesture callbacks.
  const latest = useRef({});
  latest.current = { tables, elements, view, selection, area, isEdit, onChange, onSelect, onChangeEnd };

  const gestureState = useRef(null);

  const bounds = useMemo(
    () => contentBounds({ tables, elements }, area),
    // Refit only when the area or fitKey changes, not on
    // every move while editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [area?.width, area?.height, fitKey, size?.width, size?.height]
  );

  function fit() {
    if (!size) {
      return null;
    }

    const padding = 16;
    const scale = Math.min(
      (size.width - padding * 2) / bounds.width,
      (size.height - padding * 2) / bounds.height
    );

    return {
      scale,
      base: scale,
      tx: (size.width - bounds.width * scale) / 2 - bounds.x * scale,
      ty: (size.height - bounds.height * scale) / 2 - bounds.y * scale,
    };
  }

  useEffect(() => {
    setView(fit());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds]);

  function toPlan(x, y) {
    const current = latest.current.view;

    return { x: (x - current.tx) / current.scale, y: (y - current.ty) / current.scale };
  }

  function findItem(selection) {
    if (!selection) {
      return null;
    }

    const list = selection.kind === "table" ? latest.current.tables : latest.current.elements;

    return list.find((item) => item.id === selection.id) ?? null;
  }

  function zoomBy(factor, focus) {
    setView((current) => {
      if (!current) {
        return current;
      }

      const scale = Math.min(
        current.base * MAX_ZOOM,
        Math.max(current.base * MIN_ZOOM, current.scale * factor)
      );
      const fx = focus?.x ?? size.width / 2;
      const fy = focus?.y ?? size.height / 2;

      return {
        ...current,
        scale,
        tx: fx - ((fx - current.tx) * scale) / current.scale,
        ty: fy - ((fy - current.ty) * scale) / current.scale,
      };
    });
  }

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(4)
    .maxPointers(1)
    .onStart((event) => {
      const { view: current, isEdit: editing, selection: selected } = latest.current;

      if (!current) {
        return;
      }

      const startX = event.x - event.translationX;
      const startY = event.y - event.translationY;
      const point = toPlan(startX, startY);

      if (editing) {
        const selectedItem = findItem(selected);
        const handle =
          selectedItem && handleAt(selectedItem, point, (HANDLE_PX + 8) / current.scale);

        if (handle) {
          gestureState.current = { type: "resize", handle, kind: selected.kind, origin: selectedItem };
          return;
        }

        const hit = itemAt(point, latest.current, 6 / current.scale);

        if (hit) {
          const origin = findItem(hit);

          latest.current.onSelect?.(hit);
          gestureState.current = { type: "move", kind: hit.kind, origin };
          return;
        }
      }

      gestureState.current = { type: "pan", tx: current.tx, ty: current.ty };
    })
    .onUpdate((event) => {
      const state = gestureState.current;
      const { view: current, area: currentArea } = latest.current;

      if (!state || !current) {
        return;
      }

      if (state.type === "pan") {
        setView({ ...current, tx: state.tx + event.translationX, ty: state.ty + event.translationY });
        return;
      }

      const dx = event.translationX / current.scale;
      const dy = event.translationY / current.scale;

      const next =
        state.type === "move"
          ? moveItem(state.origin, dx, dy, currentArea)
          : resizeItem(state.origin, state.handle, dx, dy, {
              keepSquare: state.origin.shape === "ROUND",
            });

      latest.current.onChange?.(state.kind, next);
      setDragInfo({ kind: state.kind, id: next.id, width: next.width, height: next.height, type: state.type });
    })
    .onEnd(() => {
      const state = gestureState.current;

      if (state && state.type !== "pan") {
        latest.current.onChangeEnd?.();
      }

      gestureState.current = null;
      setDragInfo(null);
    });

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onStart((event) => {
      gestureState.current = {
        type: "pinch",
        view: latest.current.view,
        focalX: event.focalX,
        focalY: event.focalY,
      };
    })
    .onUpdate((event) => {
      const state = gestureState.current;

      if (!state || state.type !== "pinch" || !state.view) {
        return;
      }

      const start = state.view;
      const scale = Math.min(
        start.base * MAX_ZOOM,
        Math.max(start.base * MIN_ZOOM, start.scale * event.scale)
      );
      const ratio = scale / start.scale;

      setView({
        ...start,
        scale,
        tx: event.focalX - (state.focalX - start.tx) * ratio,
        ty: event.focalY - (state.focalY - start.ty) * ratio,
      });
    })
    .onEnd(() => {
      gestureState.current = null;
    });

  const tap = Gesture.Tap()
    .runOnJS(true)
    .maxDistance(10)
    .onEnd((event, success) => {
      if (!success || !latest.current.view) {
        return;
      }

      const point = toPlan(event.x, event.y);
      const hit = itemAt(point, latest.current, 8 / latest.current.view.scale);

      latest.current.onSelect?.(hit);
    });

  const doubleTap = Gesture.Tap()
    .runOnJS(true)
    .numberOfTaps(2)
    .onEnd((event, success) => {
      if (success) {
        zoomBy(1.8, { x: event.x, y: event.y });
      }
    });

  const gesture = Gesture.Simultaneous(
    pinch,
    Gesture.Exclusive(pan, doubleTap, tap)
  );

  const scale = view?.scale ?? 1;
  const toScreen = (x, y) => ({ x: x * scale + (view?.tx ?? 0), y: y * scale + (view?.ty ?? 0) });

  const selectedItem = findItem(selection);

  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;

        if (!size || Math.abs(size.width - width) > 1 || Math.abs(size.height - height) > 1) {
          setSize({ width, height });
        }
      }}
    >
      {size && view ? (
        <GestureDetector gesture={gesture}>
          <View style={StyleSheet.absoluteFill} collapsable={false}>
            <Svg width={size.width} height={size.height}>
              <G transform={`translate(${view.tx} ${view.ty}) scale(${scale})`}>
                {/* Floor and outer walls */}
                <Rect
                  width={area.width}
                  height={area.height}
                  fill={floorColors.canvas}
                  stroke={floorColors.wall}
                  strokeWidth={10}
                />

                {isEdit
                  ? Array.from({ length: Math.floor(area.width / 50) - 1 }, (_, i) =>
                      Array.from({ length: Math.floor(area.height / 50) - 1 }, (_, j) => (
                        <Circle
                          key={`${i}-${j}`}
                          cx={(i + 1) * 50}
                          cy={(j + 1) * 50}
                          r={1.6 / scale + 0.8}
                          fill={floorColors.grid}
                        />
                      ))
                    )
                  : null}

                {/* Rooms first, then walls, furniture and doors. */}
                {[...elements]
                  .sort((a, b) => {
                    const order = (element) =>
                      ELEMENT_TYPES[element.type]?.room ? 0 : element.type === "DOOR" ? 3 : element.type === "WALL" ? 1 : 2;
                    return order(a) - order(b);
                  })
                  .map((element) => (
                    <ElementShape key={element.id} element={element} roomState={roomStates[element.id]} />
                  ))}

                {tables.map((table) => {
                  const live = tableStates[table.id];
                  const colors = isEdit
                    ? floorColors.free
                    : STATE_COLORS[live?.state] ?? floorColors.free;
                  const dimmed = highlightIds ? !highlightIds.includes(table.id) : false;

                  return <TableShape key={table.id} table={table} colors={colors} dimmed={dimmed} />;
                })}

                {selectedItem ? (
                  <Polygon
                    points={(() => {
                      const ring = handlePositions({
                        ...selectedItem,
                        x: selectedItem.x - 14,
                        y: selectedItem.y - 14,
                        width: selectedItem.width + 28,
                        height: selectedItem.height + 28,
                      });

                      return [ring.nw, ring.ne, ring.se, ring.sw]
                        .map((point) => `${point.x},${point.y}`)
                        .join(" ");
                    })()}
                    fill="none"
                    stroke={floorColors.selection}
                    strokeWidth={2 / scale}
                    strokeDasharray={isEdit ? `${6 / scale} ${4 / scale}` : undefined}
                  />
                ) : null}
              </G>

              {/* Labels in screen pixels */}
              {elements.map((element) => {
                const info = ELEMENT_TYPES[element.type] ?? {};
                const live = roomStates[element.id];
                const topLeft = toScreen(element.x, element.y);
                const center = toScreen(element.x + element.width / 2, element.y + element.height / 2);
                const screenWidth = element.width * scale;
                const screenHeight = element.height * scale;

                if (["WALL", "WINDOW", "DOOR", "PLANT"].includes(element.type)) {
                  return null;
                }

                if (element.type === "ROOM") {
                  const colors = ROOM_STATE_COLORS[live?.state] ?? floorColors.free;
                  const lines = [];

                  if (!isEdit && live) {
                    if (live.state === "busy" || live.state === "soon") {
                      lines.push(
                        `${live.appointment.firstName ?? ""} · ${live.appointment.therapistName ?? ""}`.trim(),
                        live.state === "soon"
                          ? t("floor.room.readyAt", { time: formatTime(live.appointment.endTime) })
                          : t("floor.room.minutesLeft", { count: live.minutesLeft })
                      );
                    } else if (live.state === "cleaning") {
                      lines.push(t("floor.room.cleaning"), t("floor.room.freeAt", { time: formatTime(live.freeAt.toISOString()) }));
                    } else {
                      lines.push(
                        t("floor.room.free"),
                        live.next ? t("floor.room.next", { time: formatTime(live.next.startTime) }) : ""
                      );
                    }
                  }

                  const maxChars = Math.max(4, Math.floor((screenWidth - 14) / 6.2));
                  const fit = (text) => (text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text);

                  return (
                    <G key={`label-${element.id}`}>
                      <SvgText
                        x={topLeft.x + 8}
                        y={topLeft.y + 17}
                        fontSize={11.5}
                        fontFamily={fonts.semibold}
                        fill={colors.text}
                      >
                        {fit(elementLabel(element))}
                      </SvgText>
                      {live?.progress !== undefined && !isEdit && screenWidth > 40 ? (
                        <>
                          <Rect x={topLeft.x + 8} y={topLeft.y + 23} width={screenWidth - 16} height={3} rx={1.5} fill="rgba(255,255,255,0.3)" />
                          <Rect x={topLeft.x + 8} y={topLeft.y + 23} width={(screenWidth - 16) * live.progress} height={3} rx={1.5} fill="#FFFFFF" />
                        </>
                      ) : null}
                      {screenHeight > 60
                        ? lines.filter(Boolean).map((line, index, all) => (
                            <SvgText
                              key={index}
                              x={topLeft.x + 8}
                              y={topLeft.y + screenHeight - 10 - (all.length - 1 - index) * 13}
                              fontSize={index === 0 ? 10.5 : 10}
                              fontFamily={index === 0 ? fonts.medium : fonts.regular}
                              fill={colors.text}
                              opacity={index === 0 ? 1 : 0.8}
                            >
                              {fit(line)}
                            </SvgText>
                          ))
                        : null}
                    </G>
                  );
                }

                if (screenWidth < 30 && element.type !== "LABEL") {
                  return null;
                }

                const isRoomLike = info.room;

                return (
                  <SvgText
                    key={`label-${element.id}`}
                    x={isRoomLike ? topLeft.x + 8 : center.x}
                    y={isRoomLike ? topLeft.y + 17 : center.y + 4}
                    textAnchor={isRoomLike ? "start" : "middle"}
                    fontSize={element.type === "LABEL" ? 12 : 10.5}
                    fontFamily={fonts.semibold}
                    letterSpacing={isRoomLike || element.type === "LABEL" ? 0 : 1.4}
                    fill={floorColors.decorText}
                  >
                    {element.type === "BAR" && !element.label
                      ? elementLabel(element).toUpperCase()
                      : elementLabel(element)}
                  </SvgText>
                );
              })}

              {tables.map((table) => {
                const live = tableStates[table.id];
                const colors = isEdit ? floorColors.free : STATE_COLORS[live?.state] ?? floorColors.free;
                const center = toScreen(table.x + table.width / 2, table.y + table.height / 2);
                const screenSize = Math.min(table.width, table.height) * scale;
                const reservation = !isEdit ? live?.reservation : null;
                const dimmed = highlightIds ? !highlightIds.includes(table.id) : false;

                if (reservation && screenSize >= 38) {
                  return (
                    <G key={`label-${table.id}`} opacity={dimmed ? 0.45 : 1}>
                      <SvgText
                        x={center.x}
                        y={center.y - 2}
                        textAnchor="middle"
                        fontSize={11}
                        fontFamily={fonts.semibold}
                        fill={colors.text}
                      >
                        {shortName(reservation)}
                      </SvgText>
                      <SvgText
                        x={center.x}
                        y={center.y + 11}
                        textAnchor="middle"
                        fontSize={9.5}
                        fontFamily={fonts.regular}
                        fill={colors.text}
                        opacity={0.85}
                      >
                        {`${table.name} · ${formatTime(reservation.startTime)}`}
                      </SvgText>
                    </G>
                  );
                }

                return (
                  <G key={`label-${table.id}`} opacity={dimmed ? 0.45 : 1}>
                    <SvgText
                      x={center.x}
                      y={center.y + (screenSize >= 34 ? 0 : 4)}
                      textAnchor="middle"
                      fontSize={screenSize >= 26 ? 12 : 9}
                      fontFamily={fonts.semibold}
                      fill={colors.text}
                    >
                      {table.name}
                    </SvgText>
                    {screenSize >= 34 ? (
                      <SvgText
                        x={center.x}
                        y={center.y + 12}
                        textAnchor="middle"
                        fontSize={9}
                        fontFamily={fonts.regular}
                        fill={colors.text}
                        opacity={0.7}
                      >
                        {t("floor.seatsShort", { count: table.capacity })}
                      </SvgText>
                    ) : null}
                  </G>
                );
              })}

              {/* Resize handles and the size while dragging */}
              {isEdit && selectedItem
                ? Object.values(handlePositions(selectedItem)).map((point, index) => {
                    const screen = toScreen(point.x, point.y);

                    return (
                      <Rect
                        key={index}
                        x={screen.x - HANDLE_PX / 2}
                        y={screen.y - HANDLE_PX / 2}
                        width={HANDLE_PX}
                        height={HANDLE_PX}
                        rx={2.5}
                        fill={floorColors.handle}
                        stroke="#1F5F55"
                        strokeWidth={1.5}
                      />
                    );
                  })
                : null}

              {dragInfo && selectedItem ? (
                (() => {
                  const top = toScreen(selectedItem.x + selectedItem.width / 2, selectedItem.y);
                  const label = `${Math.round(dragInfo.width)} × ${Math.round(dragInfo.height)} cm`;
                  const width = label.length * 6.4 + 14;

                  return (
                    <G>
                      <Rect x={top.x - width / 2} y={top.y - 40} width={width} height={20} rx={6} fill="#1F5F55" />
                      <SvgText
                        x={top.x}
                        y={top.y - 26}
                        textAnchor="middle"
                        fontSize={11}
                        fontFamily={fonts.medium}
                        fill="#FFFFFF"
                      >
                        {label}
                      </SvgText>
                    </G>
                  );
                })()
              ) : null}
            </Svg>
          </View>
        </GestureDetector>
      ) : null}

      <View style={styles.zoom} pointerEvents="box-none">
        <ZoomButton icon={Plus} label={t("floor.zoomIn")} onPress={() => zoomBy(1.4)} />
        <ZoomButton icon={Minus} label={t("floor.zoomOut")} onPress={() => zoomBy(1 / 1.4)} />
        <ZoomButton icon={Maximize2} label={t("floor.fit")} onPress={() => setView(fit())} />
      </View>
    </View>
  );
}

function ZoomButton({ icon: Icon, label, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.zoomButton, pressed && styles.zoomPressed]}
    >
      <Icon size={16} color="#CFDAD5" strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: floorColors.canvas,
    overflow: "hidden",
  },

  zoom: {
    position: "absolute",
    right: 10,
    bottom: 10,
    gap: 6,
  },

  zoomButton: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: "#2B3935",
    borderWidth: 1,
    borderColor: "#3C4B46",
    alignItems: "center",
    justifyContent: "center",
  },

  zoomPressed: {
    backgroundColor: "#35453F",
  },
});
