/**
 * Determines the reservation state of a table
 * for the selected dashboard day.
 *
 * States:
 *
 * AVAILABLE
 *   No confirmed or seated reservation is
 *   assigned to the table.
 *
 * RESERVED
 *   A confirmed reservation is assigned to
 *   the table, but its arrival window has
 *   not started yet.
 *
 * ARRIVING
 *   A confirmed reservation is assigned to
 *   the table and its arrival window has started.
 *
 * SEATED
 *   The guests have arrived and are currently
 *   seated at the table.
 *
 * The arrival window is currently fixed at
 * 30 minutes before the reservation start.
 */

const ARRIVAL_WINDOW_MINUTES = 30;

export function getTableReservationState(
  table,
  reservations,
  currentTime = new Date()
) {
  const tableReservations =
    reservations.filter(
      (reservation) =>
        (
          reservation.status ===
            "CONFIRMED" ||
          reservation.status ===
            "SEATED"
        ) &&
        reservation.tables?.some(
          (reservationTable) =>
            reservationTable.tableId ===
            table.id
        )
    );

  if (
    tableReservations.length === 0
  ) {
    return "AVAILABLE";
  }

  const seatedReservation =
    tableReservations.find(
      (reservation) =>
        reservation.status ===
        "SEATED"
    );

  if (seatedReservation) {
    return "SEATED";
  }

  const hasArrivingReservation =
    tableReservations.some(
      (reservation) => {
        const startTime =
          new Date(
            reservation.startTime
          );

        const arrivalStart =
          new Date(
            startTime.getTime() -
              ARRIVAL_WINDOW_MINUTES *
                60 *
                1000
          );

        return (
          currentTime >=
            arrivalStart &&
          currentTime <
            startTime
        );
      }
    );

  if (hasArrivingReservation) {
    return "ARRIVING";
  }

  return "RESERVED";
}