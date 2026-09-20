/**
 * Determines the current reservation state
 * of a table based on the reservations loaded
 * for the selected dashboard day.
 *
 * A table is:
 * - RESERVED when at least one confirmed
 *   reservation is assigned to it.
 * - AVAILABLE when no confirmed reservation
 *   is assigned to it.
 */
export function getTableReservationState(
  table,
  reservations
) {
  const hasReservation =
    reservations.some(
      (reservation) =>
        reservation.status ===
          "CONFIRMED" &&
        reservation.tables?.some(
          (reservationTable) =>
            reservationTable.tableId ===
            table.id
        )
    );

  if (hasReservation) {
    return "RESERVED";
  }

  return "AVAILABLE";
}