import {
  isInsideService,
  servicesForDay,
  tableNames,
} from "../hooks/useRestaurantDay";
import { freeTablesForWalkIn } from "../components/walk-in";
import { computeRestaurantAnalytics } from "../hooks/useRestaurantAnalytics";
import { guestSummary } from "../hooks/useGuestHistory";

jest.mock("../services/api", () => ({ api: {} }));
jest.mock("../context/auth-context", () => ({ useAuth: () => ({}) }));

const at = (day, time) => new Date(`${day}T${time}:00`);

function reservation(id, day, start, minutes = 120, extra = {}) {
  const startTime = at(day, start);

  return {
    id,
    status: "CONFIRMED",
    guestCount: 2,
    startTime: startTime.toISOString(),
    endTime: new Date(startTime.getTime() + minutes * 60000).toISOString(),
    tables: [],
    ...extra,
  };
}

// 2026-11-04 is a Wednesday.
const openingHours = [
  { dayOfWeek: "WEDNESDAY", opensAtMinutes: 18 * 60, closesAtMinutes: 22 * 60 },
  { dayOfWeek: "WEDNESDAY", opensAtMinutes: 12 * 60, closesAtMinutes: 14 * 60 + 30 },
  { dayOfWeek: "THURSDAY", opensAtMinutes: 11 * 60, closesAtMinutes: 23 * 60 },
];

describe("services of a day", () => {
  test("two periods are lunch and dinner, in the order of the day", () => {
    const services = servicesForDay(openingHours, "2026-11-04");

    expect(services.map((service) => service.title)).toEqual(["Middagservice", "Avondservice"]);
    expect(services[0].subtitle).toBe("12:00 – 14:30");
  });

  test("one period is just the service; a closed day has none", () => {
    expect(servicesForDay(openingHours, "2026-11-05").map((service) => service.title)).toEqual(["Service"]);
    expect(servicesForDay(openingHours, "2026-11-06")).toEqual([]);
  });

  test("a reservation belongs to the service it starts in", () => {
    const [lunch, dinner] = servicesForDay(openingHours, "2026-11-04");
    const late = reservation("r", "2026-11-04", "20:00");

    expect(isInsideService(late, dinner)).toBe(true);
    expect(isInsideService(late, lunch)).toBe(false);
  });

  test("table names of a reservation", () => {
    const tables = [{ id: "a", name: "T4" }, { id: "b", name: "T5" }];
    const booking = { tables: [{ tableId: "a" }, { tableId: "b", table: { name: "T5" } }] };

    expect(tableNames(booking, tables)).toBe("T4 + T5");
  });
});

describe("walk-in tables", () => {
  const tables = [
    { id: "small", name: "T1", capacity: 2 },
    { id: "big", name: "T2", capacity: 6 },
    { id: "four", name: "T3", capacity: 4 },
    { id: "off", name: "T9", capacity: 4, isActive: false },
  ];
  const now = at("2026-11-04", "19:00");

  test("free, big enough and smallest first", () => {
    const options = freeTablesForWalkIn(tables, [], 3, 90, now);

    expect(options.map((option) => option.table.id)).toEqual(["four", "big"]);
  });

  test("a table booked within the stay is not offered; one booked after it shows until when", () => {
    const reservations = [
      reservation("soon", "2026-11-04", "20:00", 120, { tables: [{ tableId: "four" }] }),
      reservation("later", "2026-11-04", "21:00", 120, { tables: [{ tableId: "big" }] }),
    ];

    const options = freeTablesForWalkIn(tables, reservations, 3, 90, now);

    expect(options.map((option) => option.table.id)).toEqual(["big"]);
    expect(options[0].next.id).toBe("later");
  });

  test("a cancelled reservation frees the table", () => {
    const reservations = [
      reservation("gone", "2026-11-04", "19:30", 120, { status: "CANCELLED", tables: [{ tableId: "four" }] }),
    ];

    expect(freeTablesForWalkIn(tables, reservations, 4, 90, now).map((option) => option.table.id)).toEqual([
      "four",
      "big",
    ]);
  });
});

describe("restaurant analytics", () => {
  const now = at("2026-11-06", "12:00");
  const days = ["2026-11-04", "2026-11-05"];

  const guests = [
    {
      id: "g1",
      firstName: "Lisa",
      lastName: "Janssens",
      reservations: [
        reservation("a", "2026-11-04", "19:00", 120, { status: "COMPLETED", guestCount: 4, source: "AI" }),
        reservation("b", "2026-11-05", "12:30", 120, { status: "NO_SHOW" }),
        reservation("old", "2026-10-01", "19:00", 120, { status: "COMPLETED" }),
      ],
    },
    {
      id: "g2",
      firstName: "Tom",
      lastName: "Maes",
      reservations: [
        reservation("c", "2026-11-04", "20:00", 120, { status: "CANCELLED" }),
        reservation("d", "2026-11-05", "19:00", 120, { status: "COMPLETED", guestCount: 2 }),
      ],
    },
    {
      id: "other",
      anonymous: true,
      reservations: [
        reservation("w", "2026-11-04", "13:00", 90, { status: "COMPLETED", guestCount: 3, source: "WALK_IN" }),
      ],
    },
  ];

  const result = computeRestaurantAnalytics(days, guests, openingHours, now);

  test("totals: reservations, covers, no-shows and cancellations", () => {
    expect(result.reservationCount).toBe(4);
    expect(result.covers).toBe(9);
    expect(result.missedCount).toBe(1);
    expect(result.cancelledCount).toBe(1);
    expect(result.walkInCount).toBe(1);
    expect(result.aiCount).toBe(1);
  });

  test("walk-ins count in the totals but not as a guest", () => {
    expect(result.guestCount).toBe(2);
    expect(result.topGuests.map((guest) => guest.id)).not.toContain("other");
  });

  test("new and returning guests", () => {
    // Lisa came before the period, Tom did not.
    expect(result.newGuestCount).toBe(1);
    expect(result.returningRate).toBe(0.5);
  });

  test("covers per day and lunch before dinner", () => {
    expect(result.days).toEqual([
      { day: "2026-11-04", covers: 7, count: 2 },
      { day: "2026-11-05", covers: 2, count: 1 },
    ]);
    expect(result.services.map((service) => service.name)).toEqual(["Middagservice", "Avondservice", "Service"]);
  });

  test("a past confirmed reservation counts as not come", () => {
    const missed = computeRestaurantAnalytics(
      ["2026-11-04"],
      [{ id: "g", firstName: "A", lastName: "B", reservations: [reservation("x", "2026-11-04", "19:00")] }],
      openingHours,
      now
    );

    expect(missed.missedCount).toBe(1);
    expect(missed.covers).toBe(0);
  });
});

describe("guest summary", () => {
  test("visits, upcoming, missed and the last visit", () => {
    const summary = guestSummary(
      {
        reservations: [
          reservation("a", "2026-10-01", "19:00", 120, { status: "COMPLETED", guestCount: 2 }),
          reservation("b", "2026-10-20", "19:00", 120, { status: "SEATED", guestCount: 4 }),
          reservation("c", "2026-10-25", "19:00", 120, { status: "NO_SHOW" }),
          reservation("d", "2026-12-01", "19:00"),
        ],
      },
      at("2026-11-04", "12:00")
    );

    expect(summary).toMatchObject({ visits: 2, upcoming: 1, missed: 1, cancelled: 0, averageParty: 3 });
    expect(summary.lastVisit.id).toBe("b");
  });
});
