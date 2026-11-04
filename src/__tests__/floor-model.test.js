import {
  chairPositions,
  containsPoint,
  contentBounds,
  handleAt,
  itemAt,
  moveItem,
  resizeItem,
  roomLiveState,
  rotateItem,
  snap,
  tableLiveState,
} from "../components/floor/floor-model";

const at = (time) => new Date(`2026-11-04T${time}:00`);

function reservation(id, start, end, status = "CONFIRMED", tableId = "t1") {
  return {
    id,
    status,
    guestCount: 2,
    startTime: at(start).toISOString(),
    endTime: at(end).toISOString(),
    tables: [{ tableId }],
  };
}

const table = { id: "t1", name: "T1", capacity: 4, shape: "SQUARE", x: 100, y: 100, width: 80, height: 80, rotation: 0 };

describe("geometry", () => {
  test("snaps to the 10 cm grid", () => {
    expect(snap(14)).toBe(10);
    expect(snap(15)).toBe(20);
    expect(snap(-4)).toBe(-0);
  });

  test("finds a point on an item, rotation included", () => {
    expect(containsPoint(table, { x: 140, y: 140 })).toBe(true);
    expect(containsPoint(table, { x: 90, y: 140 })).toBe(false);
    expect(containsPoint(table, { x: 90, y: 140 }, 12)).toBe(true);

    const long = { x: 0, y: 0, width: 200, height: 20, rotation: 90 };
    // Turned upright around its centre (100, 10).
    expect(containsPoint(long, { x: 100, y: 90 })).toBe(true);
    expect(containsPoint(long, { x: 180, y: 10 })).toBe(false);
  });

  test("prefers tables, then the smallest element", () => {
    const room = { id: "room", x: 0, y: 0, width: 500, height: 500 };
    const plant = { id: "plant", x: 300, y: 300, width: 50, height: 50 };

    expect(itemAt({ x: 140, y: 140 }, { tables: [table], elements: [room] })).toEqual({ kind: "table", id: "t1" });
    expect(itemAt({ x: 320, y: 320 }, { tables: [table], elements: [room, plant] })).toEqual({ kind: "element", id: "plant" });
    expect(itemAt({ x: 900, y: 900 }, { tables: [table], elements: [room] })).toBeNull();
  });

  test("moves on the grid and stays in the area", () => {
    const area = { width: 400, height: 300 };

    expect(moveItem(table, 33, -12, area)).toMatchObject({ x: 130, y: 90 });
    expect(moveItem(table, 5000, 5000, area)).toMatchObject({ x: 360, y: 260 });
  });

  test("resizes from a corner and keeps the opposite corner", () => {
    const grown = resizeItem(table, "se", 40, 20);
    expect(grown).toMatchObject({ x: 100, y: 100, width: 120, height: 100 });

    const fromTopLeft = resizeItem(table, "nw", 20, 20);
    expect(fromTopLeft).toMatchObject({ x: 120, y: 120, width: 60, height: 60 });

    // Never smaller than 20 cm.
    expect(resizeItem(table, "se", -500, -500)).toMatchObject({ width: 20, height: 20 });

    // Round tables stay round.
    expect(resizeItem({ ...table, shape: "ROUND" }, "se", 40, 0, { keepSquare: true })).toMatchObject({
      width: 120,
      height: 120,
    });
  });

  test("finds the corner handle under a finger", () => {
    expect(handleAt(table, { x: 182, y: 181 }, 6)).toBe("se");
    expect(handleAt(table, { x: 99, y: 99 }, 6)).toBe("nw");
    expect(handleAt(table, { x: 140, y: 140 }, 6)).toBeNull();
  });

  test("rotates in steps of 45 degrees", () => {
    expect(rotateItem(table).rotation).toBe(45);
    expect(rotateItem({ ...table, rotation: 315 }).rotation).toBe(0);
  });

  test("fits the drawing, not the whole area", () => {
    const bounds = contentBounds({ tables: [table], elements: [] }, { width: 1200, height: 900 }, 50);
    expect(bounds).toEqual({ x: 50, y: 50, width: 180, height: 180 });

    expect(contentBounds({}, { width: 1200, height: 900 })).toEqual({ x: 0, y: 0, width: 1200, height: 900 });
  });
});

describe("chairs", () => {
  test("one chair per seat", () => {
    expect(chairPositions({ ...table, capacity: 4 })).toHaveLength(4);
    expect(chairPositions({ ...table, shape: "ROUND", capacity: 7 })).toHaveLength(7);
    expect(chairPositions({ ...table, shape: "RECTANGLE", width: 180, capacity: 8 })).toHaveLength(8);
    expect(chairPositions({ ...table, capacity: 0 })).toHaveLength(0);
  });

  test("long tables get chairs at the ends from six seats", () => {
    const chairs = chairPositions({ ...table, shape: "RECTANGLE", width: 180, height: 80, capacity: 6 });
    const atEnds = chairs.filter((chair) => chair.x < 0 || chair.x > 180);

    expect(atEnds).toHaveLength(2);
  });
});

describe("table state during the service", () => {
  test("free without reservations", () => {
    expect(tableLiveState(table, [], at("19:00")).state).toBe("free");
  });

  test("reserved, arriving, late and seated", () => {
    const later = [reservation("r1", "21:00", "23:00")];
    expect(tableLiveState(table, later, at("19:00"))).toMatchObject({ state: "reserved", reservation: { id: "r1" } });

    const soon = [reservation("r1", "19:20", "21:20")];
    expect(tableLiveState(table, soon, at("19:00")).state).toBe("arriving");

    const late = [reservation("r1", "18:30", "20:30")];
    expect(tableLiveState(table, late, at("19:00")).state).toBe("late");

    const seated = [reservation("r1", "18:30", "20:30", "SEATED"), reservation("r2", "21:00", "23:00")];
    expect(tableLiveState(table, seated, at("19:00"))).toMatchObject({ state: "seated", reservation: { id: "r1" } });
  });

  test("ignores other tables and finished reservations", () => {
    const reservations = [
      reservation("other", "19:00", "21:00", "CONFIRMED", "t2"),
      reservation("done", "18:00", "19:30", "COMPLETED"),
      reservation("gone", "18:00", "19:30", "NO_SHOW"),
    ];

    expect(tableLiveState(table, reservations, at("19:00")).state).toBe("free");
  });
});

describe("room state", () => {
  const appointment = (id, start, end, status = "CONFIRMED") => ({
    id,
    roomId: "room1",
    status,
    startTime: at(start).toISOString(),
    endTime: at(end).toISOString(),
  });

  test("busy with the minutes left and the progress", () => {
    const state = roomLiveState({ id: "room1", name: "Kamer 1" }, [appointment("a", "14:00", "15:00")], at("14:15"));

    expect(state).toMatchObject({ state: "busy", minutesLeft: 45 });
    expect(state.progress).toBeCloseTo(0.25);
  });

  test("soon in the last ten minutes", () => {
    expect(roomLiveState({ id: "room1", name: "Kamer 1" }, [appointment("a", "14:00", "15:00")], at("14:52")).state).toBe("soon");
  });

  test("cleaning during the break after an appointment", () => {
    const state = roomLiveState({ id: "room1", name: "Kamer 1" }, [appointment("a", "13:00", "14:00")], at("14:05"), 15);

    expect(state.state).toBe("cleaning");
    expect(state.freeAt.getTime()).toBe(at("14:15").getTime());
  });

  test("matches on the room name when there is no room id", () => {
    const byName = { id: "x", status: "CONFIRMED", roomName: "Kamer 1", startTime: at("14:00").toISOString(), endTime: at("15:00").toISOString() };

    expect(roomLiveState({ id: "room1", name: "Kamer 1" }, [byName], at("14:15")).state).toBe("busy");
    expect(roomLiveState({ id: "room2", name: "Kamer 2" }, [byName], at("14:15")).state).toBe("free");
  });

  test("free with the next appointment; cancelled ones do not count", () => {
    const state = roomLiveState(
      { id: "room1", name: "Kamer 1" },
      [appointment("x", "14:00", "15:00", "CANCELLED"), appointment("b", "16:00", "17:00")],
      at("14:30")
    );

    expect(state).toMatchObject({ state: "free", next: { id: "b" } });
  });
});
