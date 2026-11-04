import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "expo-router";

import { useAuth } from "../context/auth-context";
import { api } from "../services/api";
import { minutesToTime } from "../utils/time";
import { t } from "../i18n";

// ======================================================
// One restaurant day
// ======================================================
//
// Loads what the restaurant screens need for one day:
// every reservation of the day, the opening hours split
// into services and the tables. It reloads when the
// screen gets focus and every minute, and offers what a
// host does during the service:
//
//   seat      CONFIRMED -> SEATED     (guests arrived)
//   complete  SEATED    -> COMPLETED  (guests left)
//   noShow    CONFIRMED -> NO_SHOW    (guests never came)
//   undo      one step back, for a tap by mistake
//   moveTo    put a reservation at other tables
//   walkIn    seat guests without a booking
//
// reservations holds the open ones (confirmed or seated);
// allReservations also the completed, cancelled and
// no-show ones, so they can be shown and undone.
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

  const [allReservations, setReservations] = useState([]);
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
          api.getAllReservationsForDay(
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

        const response = await request(
          business.id,
          reservation.id,
          accessToken
        );
        const updated = response?.data ?? response;

        setReservations((current) =>
          current.map((item) =>
            item.id === reservation.id
              ? {
                  ...item,
                  status: updated?.status ?? nextStatus,
                }
              : item
          )
        );

        return true;
      } catch (actionError) {
        Alert.alert(
          "Niet gelukt",
          actionError?.message ||
            "De reservatie kon niet worden bijgewerkt."
        );

        return false;
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

  const noShow = useCallback(
    (reservation) =>
      runAction(
        reservation,
        api.markReservationAsNoShow,
        "NO_SHOW"
      ),
    [runAction]
  );

  const undo = useCallback(
    (reservation) =>
      runAction(
        reservation,
        api.undoReservationStatus,
        { SEATED: "CONFIRMED", COMPLETED: "SEATED", NO_SHOW: "CONFIRMED" }[
          reservation.status
        ]
      ),
    [runAction]
  );

  const moveTo = useCallback(
    async (reservation, tableIds) => {
      try {
        setActionId(reservation.id);

        const response = await api.moveReservationToTables(
          business.id,
          reservation.id,
          tableIds,
          accessToken
        );
        const updated = response?.data ?? response;

        setReservations((current) =>
          current.map((item) =>
            item.id === reservation.id
              ? { ...item, tables: updated?.tables ?? item.tables }
              : item
          )
        );

        return true;
      } catch (moveError) {
        Alert.alert(
          t("floor.notMoved"),
          moveError?.status === 409
            ? t("floor.tableTakenThen")
            : moveError?.message || t("common.tryAgain")
        );

        return false;
      } finally {
        setActionId(null);
      }
    },
    [accessToken, business?.id]
  );

  const walkIn = useCallback(
    async ({ guestCount, tableIds, durationMinutes, name }) => {
      try {
        const response = await api.createWalkIn(
          business.id,
          { guestCount, tableIds, durationMinutes, name },
          accessToken
        );
        const created = response?.data ?? response;

        if (created?.id) {
          setReservations((current) => [...current, created]);
        }

        return created;
      } catch (walkInError) {
        Alert.alert(
          t("walkIn.failed"),
          walkInError?.status === 409
            ? t("floor.tableTakenThen")
            : walkInError?.message || t("common.tryAgain")
        );

        return null;
      }
    },
    [accessToken, business?.id]
  );

  const reservations = useMemo(
    () =>
      allReservations.filter(
        (reservation) =>
          reservation.status === "CONFIRMED" ||
          reservation.status === "SEATED"
      ),
    [allReservations]
  );

  return {
    reservations,
    allReservations,
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
    noShow,
    undo,
    moveTo,
    walkIn,
    actionId,
  };
}
