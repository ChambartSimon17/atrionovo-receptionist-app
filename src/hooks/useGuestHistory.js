import {
  useCallback,
  useState,
} from "react";
import { useFocusEffect } from "expo-router";

import { useAuth } from "../context/auth-context";
import { api } from "../services/api";

// ======================================================
// Guest history
// ======================================================
//
// Every guest of the business together with all their
// reservations and appointments, in any status, from one
// request (/guest-history). Bookings without a guest
// (walk-ins) come along as otherReservations, so the
// Gasten and Analyse screens see the whole history.
//
// An older backend without that endpoint gets the guest
// list and then each profile, a few at a time.
//
// The result is kept for a few minutes, so switching
// between those screens does not load it again.
// ======================================================

const PARALLEL_REQUESTS = 6;
const CACHE_MS = 3 * 60 * 1000;

let cache = null; // { token, loadedAt, guests, otherReservations }

async function loadProfiles(customers, accessToken, onProgress) {
  const guests = new Array(customers.length);
  let next = 0;
  let done = 0;

  async function worker() {
    while (next < customers.length) {
      const index = next;
      next += 1;

      const customer = customers[index];

      try {
        const response = await api.getCustomer(
          customer.id,
          accessToken
        );
        const data = response?.data || response;

        guests[index] = {
          ...customer,
          ...data.customer,
          reservations: data.reservations || [],
        };
      } catch {
        guests[index] = { ...customer, reservations: [] };
      }

      done += 1;
      onProgress(done / customers.length);
    }
  }

  await Promise.all(
    Array.from({ length: PARALLEL_REQUESTS }, worker)
  );

  return guests;
}

/**
 * Visits of a guest: reservations where they came
 * (seated or completed) and that have started.
 */
export function guestSummary(guest, now = new Date()) {
  const reservations = guest.reservations ?? [];

  const visits = reservations.filter(
    (reservation) =>
      (reservation.status === "COMPLETED" ||
        reservation.status === "SEATED") &&
      new Date(reservation.startTime) <= now
  );

  const upcoming = reservations.filter(
    (reservation) =>
      reservation.status === "CONFIRMED" &&
      new Date(reservation.startTime) > now
  );

  // Confirmed reservations in the past were never marked
  // as arrived: the guests most likely did not come.
  const missed = reservations.filter(
    (reservation) =>
      reservation.status === "NO_SHOW" ||
      (reservation.status === "CONFIRMED" &&
        new Date(reservation.endTime) < now)
  );

  const cancelled = reservations.filter(
    (reservation) => reservation.status === "CANCELLED"
  );

  const lastVisit = visits.reduce(
    (latest, reservation) =>
      !latest ||
      new Date(reservation.startTime) >
        new Date(latest.startTime)
        ? reservation
        : latest,
    null
  );

  const averageParty = visits.length
    ? visits.reduce(
        (sum, reservation) => sum + reservation.guestCount,
        0
      ) / visits.length
    : null;

  return {
    visits: visits.length,
    upcoming: upcoming.length,
    missed: missed.length,
    cancelled: cancelled.length,
    lastVisit,
    averageParty,
  };
}

export default function useGuestHistory() {
  const { accessToken, business } = useAuth();

  const [guests, setGuests] = useState(
    cache?.token === accessToken ? cache.guests : null
  );
  const [otherReservations, setOtherReservations] = useState(
    cache?.token === accessToken ? cache.otherReservations : []
  );
  const [list, setList] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const load = useCallback(
    async ({ force = false } = {}) => {
      if (!accessToken) {
        return;
      }

      if (
        !force &&
        cache?.token === accessToken &&
        Date.now() - cache.loadedAt < CACHE_MS
      ) {
        setGuests(cache.guests);
        setOtherReservations(cache.otherReservations);
        return;
      }

      try {
        setError(null);

        try {
          const history = await api.getGuestHistory(business.id, accessToken);
          const data = history?.data ?? history;

          if (Array.isArray(data?.guests)) {
            cache = {
              token: accessToken,
              loadedAt: Date.now(),
              guests: data.guests,
              otherReservations: data.otherReservations ?? [],
            };
            setProgress(1);
            setList(data.guests);
            setGuests(data.guests);
            setOtherReservations(data.otherReservations ?? []);
            return;
          }
        } catch (historyError) {
          if (historyError?.status !== 404) {
            throw historyError;
          }
        }

        const response = await api.getCustomers(accessToken);
        const customers = response?.data || response || [];

        setList(customers);

        const loaded = await loadProfiles(
          customers,
          accessToken,
          setProgress
        );

        cache = {
          token: accessToken,
          loadedAt: Date.now(),
          guests: loaded,
          otherReservations: [],
        };
        setGuests(loaded);
      } catch (loadError) {
        setError(
          loadError?.message ||
            "De gasten konden niet worden geladen."
        );
      }
    },
    [accessToken, business?.id]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return {
    // Every guest with their reservations, null until
    // all profiles are loaded.
    guests,
    // Bookings without a guest, such as walk-ins.
    otherReservations,
    // The guest list without history, available first.
    list: guests ?? list,
    isLoading: guests === null && !error,
    progress,
    error,
    reload: () => load({ force: true }),
  };
}
