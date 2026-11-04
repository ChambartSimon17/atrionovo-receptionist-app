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
 *   the table and it is inside its arrival window.
 *
 * SEATED
 *   The guests have arrived and are currently
 *   seated at the table.
 *
 * The arrival window runs from 30 minutes before
 * the reservation start until an hour after it.
 */

const ARRIVAL_WINDOW_MINUTES = 30;
const LATE_WINDOW_MINUTES = 60;

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

        // Late guests keep the table "arriving" until
        // they are seated or the hour is over.
        const arrivalEnd =
          new Date(
            startTime.getTime() +
              LATE_WINDOW_MINUTES *
                60 *
                1000
          );

        return (
          currentTime >=
            arrivalStart &&
          currentTime <
            arrivalEnd
        );
      }
    );

  if (hasArrivingReservation) {
    return "ARRIVING";
  }

  return "RESERVED";
}