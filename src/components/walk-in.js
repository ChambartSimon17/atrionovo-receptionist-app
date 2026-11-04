// ======================================================
// Walk-in tables
// ======================================================
//
// Which tables can take guests without a booking right
// now. Kept apart from the sheet so it can be tested.
// ======================================================

/**
 * Tables free from now for the given minutes, with
 * enough seats, smallest first. Each comes with the time
 * of its next reservation, if any.
 */
export function freeTablesForWalkIn(tables, reservations, guestCount, minutes, now = new Date()) {
  const end = new Date(now.getTime() + minutes * 60000);

  return tables
    .filter((table) => table.isActive !== false && (table.capacity ?? 0) >= guestCount)
    .map((table) => {
      const own = reservations.filter(
        (reservation) =>
          (reservation.status === "CONFIRMED" || reservation.status === "SEATED") &&
          reservation.tables?.some((link) => link.tableId === table.id)
      );

      const busy = own.some(
        (reservation) =>
          new Date(reservation.startTime) < end && new Date(reservation.endTime) > now
      );

      const next = own
        .filter((reservation) => new Date(reservation.startTime) >= end)
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];

      return { table, busy, next };
    })
    .filter((item) => !item.busy)
    .sort(
      (a, b) =>
        a.table.capacity - b.table.capacity ||
        a.table.name.localeCompare(b.table.name, "nl", { numeric: true })
    );
}
