import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "expo-router";

import { useAuth } from "../context/auth-context";
import { api } from "../services/api";
import { minutesToTime } from "../utils/time";

// ======================================================
// One restaurant day
// ======================================================
//
// Loads what the restaurant screens need for one day: the
// reservations still open (confirmed or seated), the
// opening hours split into services and the tables. It
// reloads when the screen gets focus and every minute, and
// offers the two status changes of a reservation:
//
//   seat      CONFIRMED -> SEATED     (guests arrived)
//   complete  SEATED    -> COMPLETED  (guests left)
//
// The backend only returns open reservations for a day, so
// a completed reservation leaves the list.
// ======================================================

const WEEKDAY_KEYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

function weekdayKey(dateString) {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  return WEEKDAY_KEYS[
    new Date(year, month - 1, day, 12).getDay()
  ];
}

/**
 * Minutes after midnight of an ISO instant (phone time).
 */
export function minutesOfDay(isoString) {
  const date = new Date(isoString);

  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Opening periods of a day -> services. Two periods are
 * lunch and dinner; any other number is "Service 1, 2…".
 */
export function servicesForDay(openingHours, dateString) {
  const periods = openingHours
    .filter(
      (openingHour) =>
        openingHour.dayOfWeek === weekdayKey(dateString)
    )
    .sort((a, b) => a.opensAtMinutes - b.opensAtMinutes);

  const titles =
    periods.length === 2
      ? ["Middagservice", "Avondservice"]
      : periods.map((period, index) =>
          periods.length === 1
            ? "Service"
            : `Service ${index + 1}`
        );

  return periods.map((period, index) => ({
    key: `service-${index}`,
    title: titles[index],
    subtitle: `${minutesToTime(
      period.opensAtMinutes
    )} – ${minutesToTime(period.closesAtMinutes)}`,
    startMinutes: period.opensAtMinutes,
    endMinutes: period.closesAtMinutes,
  }));
}

export function isInsideService(reservation, service) {
  const minutes = minutesOfDay(reservation.startTime);

  return (
    minutes >= service.startMinutes &&
    minutes < service.endMinutes
  );
}

/**
 * The names of the tables of a reservation, "T4 + T5".
 */
export function tableNames(reservation, tables) {
  return (reservation.tables ?? [])
    .map(
      (reservationTable) =>
        reservationTable.table?.name ??
        tables.find(
          (table) => table.id === reservationTable.tableId
        )?.name
    )
    .filter(Boolean)
    .join(" + ");
}

export default function useRestaurantDay(date) {
  const { business, accessToken } = useAuth();

  const [reservations, setReservations] = useState([]);
  const [openingHours, setOpeningHours] = useState([]);
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);

  // Ignore answers for a day that is no longer shown.
  const dateRef = useRef(date);
  dateRef.current = date;

  const load = useCallback(
    async ({ refresh = false } = {}) => {
      if (!accessToken || !business?.id) {
        return;
      }

      const requestedDate = date;

      if (refresh) {
        setIsRefreshing(true);
      }

      try {
        const [
          reservationsResponse,
          openingHoursResponse,
          tablesResponse,
        ] = await Promise.all([
          api.getReservationsForDay(
            requestedDate,
            accessToken
          ),
          api.getOpeningHours(business.id, accessToken),
          api.getTables(business.id, accessToken),
        ]);

        if (dateRef.current !== requestedDate) {
          return;
        }

        setReservations(
          [...(reservationsResponse?.data || [])].sort(
            (a, b) =>
              new Date(a.startTime) - new Date(b.startTime)
          )
        );
        setOpeningHours(
          openingHoursResponse?.data ||
            openingHoursResponse ||
            []
        );
        // Natural order: T2 before T10.
        setTables(
          [...(tablesResponse?.data || tablesResponse || [])].sort(
            (a, b) =>
              a.name.localeCompare(b.name, "nl", {
                numeric: true,
              })
          )
        );
        setError(null);
      } catch (loadError) {
        setError(
          loadError?.message ||
            "De reservaties konden niet worden geladen."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [accessToken, business?.id, date]
  );

  // A new day shows the spinner until it is loaded.
  useEffect(() => {
    setIsLoading(true);
    setReservations([]);
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load();

      const interval = setInterval(load, 60 * 1000);

      return () => clearInterval(interval);
    }, [load])
  );

  const runAction = useCallback(
    async (reservation, request, nextStatus) => {
      try {
        setActionId(reservation.id);

        await request(
          business.id,
          reservation.id,
          accessToken
        );

        setReservations((current) =>
          nextStatus === "COMPLETED"
            ? current.filter(
                (item) => item.id !== reservation.id
              )
            : current.map((item) =>
                item.id === reservation.id
                  ? { ...item, status: nextStatus }
                  : item
              )
        );
      } catch (actionError) {
        Alert.alert(
          "Niet gelukt",
          actionError?.message ||
            "De reservatie kon niet worden bijgewerkt."
        );
      } finally {
        setActionId(null);
      }
    },
    [accessToken, business?.id]
  );

  const seat = useCallback(
    (reservation) =>
      runAction(
        reservation,
        api.markReservationAsSeated,
        "SEATED"
      ),
    [runAction]
  );

  const complete = useCallback(
    (reservation) =>
      runAction(
        reservation,
        api.markReservationAsCompleted,
        "COMPLETED"
      ),
    [runAction]
  );

  return {
    reservations,
    openingHours,
    services: servicesForDay(openingHours, date),
    tables,
    setTables,
    isLoading,
    isRefreshing,
    error,
    setError,
    reload: load,
    seat,
    complete,
    actionId,
  };
}
