import { getTableReservationState } from "../table-state";

// ======================================================
// Floor plan model
// ======================================================
//
// Plain functions shared by the floor plan canvas, the
// editor and the tests. Positions and sizes are in
// centimetres from the top left of an area (a room such
// as "Binnen", or a floor of a salon).
//
// An item is a table or an element. Both have
// { id, x, y, width, height, rotation }; a table also
// { name, capacity, shape }, an element { type, label }.
// ======================================================

export const GRID = 10;
export const MIN_SIZE = 20;

export const DEFAULT_AREA = { width: 1200, height: 900 };

// Tables that can be added from the toolbar.
export const TABLE_PRESETS = {
  ROUND: { shape: "ROUND", capacity: 2, width: 70, height: 70 },
  SQUARE: { shape: "SQUARE", capacity: 4, width: 80, height: 80 },
  RECTANGLE: { shape: "RECTANGLE", capacity: 6, width: 180, height: 80 },
};

// Every element type with its default size, whether it
// is drawn as a room (a walled area with a name) and
// which business type offers it in the toolbar.
export const ELEMENT_TYPES = {
  WALL: { width: 300, height: 12, for: ["RESTAURANT", "MASSAGE"] },
  DOOR: { width: 90, height: 90, for: ["RESTAURANT", "MASSAGE"] },
  WINDOW: { width: 150, height: 10, for: ["RESTAURANT"] },
  BAR: { width: 300, height: 70, for: ["RESTAURANT"] },
  PLANT: { width: 50, height: 50, for: ["RESTAURANT"] },
  KITCHEN: { width: 300, height: 200, room: true, for: ["RESTAURANT"] },
  LABEL: { width: 200, height: 40, for: ["RESTAURANT", "MASSAGE"] },
  ROOM: { width: 350, height: 400, room: true, for: ["MASSAGE"] },
  RECEPTION: { width: 300, height: 200, room: true, for: ["MASSAGE"] },
  WAITING: { width: 300, height: 200, room: true, for: ["MASSAGE"] },
  CHANGING: { width: 200, height: 200, room: true, for: ["MASSAGE"] },
  SAUNA: { width: 200, height: 200, room: true, for: ["MASSAGE"] },
  SHOWER: { width: 150, height: 150, room: true, for: ["MASSAGE"] },
  STAIRS: { width: 120, height: 250, for: ["MASSAGE"] },
  TOILET: { width: 150, height: 150, room: true, for: ["RESTAURANT", "MASSAGE"] },
  CORRIDOR: { width: 400, height: 150, room: true, for: ["MASSAGE"] },
};

export function snap(value, grid = GRID) {
  return Math.round(value / grid) * grid;
}

let temporaryCounter = 0;

export function temporaryId(prefix = "tmp") {
  temporaryCounter += 1;
  return `tmp-${prefix}-${Date.now().toString(36)}-${temporaryCounter}`;
}

// ------------------------------------------------------
// Geometry
// ------------------------------------------------------

function toLocal(item, point) {
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2;
  const angle = (-(item.rotation || 0) * Math.PI) / 180;
  const dx = point.x - cx;
  const dy = point.y - cy;

  return {
    x: cx + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: cy + dx * Math.sin(angle) + dy * Math.cos(angle),
  };
}

/**
 * Whether a point lies on an item, rotation included.
 * slack widens the item, so small things stay tappable.
 */
export function containsPoint(item, point, slack = 0) {
  const local = toLocal(item, point);

  return (
    local.x >= item.x - slack &&
    local.x <= item.x + item.width + slack &&
    local.y >= item.y - slack &&
    local.y <= item.y + item.height + slack
  );
}

/**
 * The item under a point: tables first, then the smallest
 * element (so a plant on top of a room wins over the
 * room).
 */
export function itemAt(point, { tables = [], elements = [] }, slack = 0) {
  const table = [...tables]
    .reverse()
    .find((candidate) => containsPoint(candidate, point, slack));

  if (table) {
    return { kind: "table", id: table.id };
  }

  const element = elements
    .filter((candidate) => containsPoint(candidate, point, slack))
    .sort((a, b) => a.width * a.height - b.width * b.height)[0];

  return element ? { kind: "element", id: element.id } : null;
}

export const HANDLES = ["nw", "ne", "sw", "se"];

export function handlePositions(item) {
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2;
  const angle = ((item.rotation || 0) * Math.PI) / 180;

  const corners = {
    nw: [-item.width / 2, -item.height / 2],
    ne: [item.width / 2, -item.height / 2],
    sw: [-item.width / 2, item.height / 2],
    se: [item.width / 2, item.height / 2],
  };

  return Object.fromEntries(
    Object.entries(corners).map(([name, [dx, dy]]) => [
      name,
      {
        x: cx + dx * Math.cos(angle) - dy * Math.sin(angle),
        y: cy + dx * Math.sin(angle) + dy * Math.cos(angle),
      },
    ])
  );
}

export function handleAt(item, point, radius) {
  const positions = handlePositions(item);

  return (
    HANDLES.find(
      (name) => Math.hypot(positions[name].x - point.x, positions[name].y - point.y) <= radius
    ) ?? null
  );
}

/**
 * Moves an item by a delta (in centimetres), snapped to
 * the grid and kept inside the area.
 */
export function moveItem(origin, dx, dy, area) {
  const x = snap(origin.x + dx);
  const y = snap(origin.y + dy);

  return {
    ...origin,
    x: Math.max(-origin.width / 2, Math.min(area.width - origin.width / 2, x)),
    y: Math.max(-origin.height / 2, Math.min(area.height - origin.height / 2, y)),
  };
}

/**
 * Resizes an item by dragging one corner; the opposite
 * corner stays put. The delta is turned into the item's
 * own (rotated) directions first.
 */
export function resizeItem(origin, handle, dx, dy, { keepSquare = false } = {}) {
  const angle = (-(origin.rotation || 0) * Math.PI) / 180;
  const localDx = dx * Math.cos(angle) - dy * Math.sin(angle);
  const localDy = dx * Math.sin(angle) + dy * Math.cos(angle);

  const signX = handle.includes("e") ? 1 : -1;
  const signY = handle.includes("s") ? 1 : -1;

  let width = Math.max(MIN_SIZE, snap(origin.width + signX * localDx));
  let height = Math.max(MIN_SIZE, snap(origin.height + signY * localDy));

  if (keepSquare) {
    width = height = Math.max(width, height);
  }

  // Keep the opposite corner in place (unrotated items;
  // rotated items grow around their centre).
  if (!origin.rotation) {
    return {
      ...origin,
      width,
      height,
      x: signX > 0 ? origin.x : origin.x + origin.width - width,
      y: signY > 0 ? origin.y : origin.y + origin.height - height,
    };
  }

  return {
    ...origin,
    width,
    height,
    x: origin.x + (origin.width - width) / 2,
    y: origin.y + (origin.height - height) / 2,
  };
}

export function rotateItem(item, step = 45) {
  return { ...item, rotation: ((item.rotation || 0) + step) % 360 };
}

/**
 * The box around everything on an area, for fitting the
 * plan to the screen. Falls back to the area itself.
 */
export function contentBounds({ tables = [], elements = [] }, area, padding = 60) {
  const items = [...tables, ...elements];

  if (items.length === 0) {
    return { x: 0, y: 0, width: area.width, height: area.height };
  }

  const minX = Math.min(...items.map((item) => item.x));
  const minY = Math.min(...items.map((item) => item.y));
  const maxX = Math.max(...items.map((item) => item.x + item.width));
  const maxY = Math.max(...items.map((item) => item.y + item.height));

  return {
    x: Math.max(0, minX - padding),
    y: Math.max(0, minY - padding),
    width: Math.min(area.width, maxX + padding) - Math.max(0, minX - padding),
    height: Math.min(area.height, maxY + padding) - Math.max(0, minY - padding),
  };
}

// ------------------------------------------------------
// Chairs
// ------------------------------------------------------

/**
 * Where the chairs of a table go, relative to the table's
 * top left: around a round table, along the long sides of
 * a rectangle (and the ends when there are many).
 */
export function chairPositions(table) {
  const count = Math.max(0, Math.min(20, table.capacity || 0));
  const { width, height } = table;
  const gap = 8;

  if (count === 0) {
    return [];
  }

  if (table.shape === "ROUND") {
    const radius = Math.max(width, height) / 2 + gap + 9;

    return Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2 - Math.PI / 2;

      return {
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        angle: (angle * 180) / Math.PI + 90,
      };
    });
  }

  const horizontal = width >= height;
  const long = horizontal ? width : height;
  const ends = count >= 6 && long >= 140 ? 2 : 0;
  const sides = count - ends;
  const first = Math.ceil(sides / 2);
  const second = sides - first;

  const along = (n, side) =>
    Array.from({ length: n }, (_, index) => {
      const offset = ((index + 0.5) / n) * long;

      return horizontal
        ? { x: offset, y: side < 0 ? -gap - 9 : height + gap + 9, angle: side < 0 ? 0 : 180 }
        : { x: side < 0 ? -gap - 9 : width + gap + 9, y: offset, angle: side < 0 ? 270 : 90 };
    });

  const endChairs =
    ends === 2
      ? horizontal
        ? [
            { x: -gap - 9, y: height / 2, angle: 270 },
            { x: width + gap + 9, y: height / 2, angle: 90 },
          ]
        : [
            { x: width / 2, y: -gap - 9, angle: 0 },
            { x: width / 2, y: height + gap + 9, angle: 180 },
          ]
      : [];

  return [...along(first, -1), ...along(second, 1), ...endChairs];
}

// ------------------------------------------------------
// Live state
// ------------------------------------------------------

const LATE_AFTER_MINUTES = 15;

/**
 * The state of a table during the service and the
 * reservation it shows: seated guests first, then the
 * next one to come.
 *
 * free | reserved | arriving | late | seated
 */
export function tableLiveState(table, reservations, now = new Date()) {
  const own = reservations
    .filter(
      (reservation) =>
        (reservation.status === "CONFIRMED" || reservation.status === "SEATED") &&
        reservation.tables?.some((link) => link.tableId === table.id)
    )
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const state = getTableReservationState(table, own, now);

  if (state === "SEATED") {
    return { state: "seated", reservation: own.find((r) => r.status === "SEATED"), upcoming: own };
  }

  const next = own.find((reservation) => new Date(reservation.endTime) > now);

  if (state === "ARRIVING" && next) {
    const late = now - new Date(next.startTime) > LATE_AFTER_MINUTES * 60000;

    return { state: late ? "late" : "arriving", reservation: next, upcoming: own };
  }

  if (next) {
    return { state: "reserved", reservation: next, upcoming: own };
  }

  return { state: "free", reservation: null, upcoming: own };
}

/**
 * What a treatment room ({ id, name }) is doing right
 * now. Appointments carry the room's id or only its name.
 *
 * free | busy | soon (ends within 10 minutes) | cleaning
 */
export function roomLiveState(room, appointments, now = new Date(), bufferMinutes = 0) {
  const own = appointments
    .filter(
      (appointment) =>
        (appointment.roomId
          ? appointment.roomId === room.id
          : appointment.roomName === room.name) &&
        appointment.status !== "CANCELLED" &&
        appointment.status !== "NO_SHOW"
    )
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const current = own.find(
    (appointment) =>
      appointment.status !== "COMPLETED" &&
      new Date(appointment.startTime) <= now &&
      now < new Date(appointment.endTime)
  );

  const next = own.find((appointment) => new Date(appointment.startTime) > now) ?? null;

  if (current) {
    const start = new Date(current.startTime).getTime();
    const end = new Date(current.endTime).getTime();
    const minutesLeft = Math.max(0, Math.ceil((end - now.getTime()) / 60000));

    return {
      state: minutesLeft <= 10 ? "soon" : "busy",
      appointment: current,
      progress: Math.min(1, Math.max(0, (now.getTime() - start) / (end - start))),
      minutesLeft,
      next,
    };
  }

  const cleaning =
    bufferMinutes > 0 &&
    own.find((appointment) => {
      const end = new Date(appointment.endTime).getTime();

      return end <= now.getTime() && now.getTime() < end + bufferMinutes * 60000;
    });

  if (cleaning) {
    return {
      state: "cleaning",
      appointment: cleaning,
      freeAt: new Date(new Date(cleaning.endTime).getTime() + bufferMinutes * 60000),
      next,
    };
  }

  return { state: "free", appointment: null, next };
}
