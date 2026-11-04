import {
  useCallback,
  useState,
} from "react";
import { useFocusEffect } from "expo-router";

import { useAuth } from "../context/auth-context";
import { api } from "../services/api";
import { toDateString } from "../utils/date";
import useGuestHistory from "./useGuestHistory";
import {
  isInsideService,
  servicesForDay,
} from "./useRestaurantDay";

// ======================================================
// useRestaurantAnalytics
// ======================================================
//
// The numbers of a restaurant over a period (a list of
// "YYYY-MM-DD" days): covers per day, reservations, party
// size, guests who did not come, cancellations, lunch
// against dinner, the busiest hours and weekdays, new and
// returning guests, the best guests and those who missed
// most.
//
// Computed in the app from the full guest history (see
// useGuestHistory), which holds every reservation.
//
// A confirmed reservation whose time has passed was never
// marked as arrived, so it counts as "not come".
// ======================================================

const WEEKDAYS = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const PARTY_SIZES = [
  { label: "1–2", max: 2 },
  { label: "3–4", max: 4 },
  { label: "5–6", max: 6 },
  { label: "7+", max: Infinity },
];

function guestName(guest) {
  return `${guest.firstName} ${guest.lastName}`.trim();
}

function isMissed(reservation, now) {
  return (
    reservation.status === "NO_SHOW" ||
    (reservation.status === "CONFIRMED" &&
      new Date(reservation.endTime) < now)
  );
}

export function computeRestaurantAnalytics(
  days,
  guests,
  openingHours,
  now = new Date()
) {
  const daySet = new Set(days);

  const perDay = new Map(
    days.map((day) => [day, { day, covers: 0, count: 0 }])
  );
  const services = new Map();
  const hours = new Map();
  const weekdays = new Map(
    WEEKDAY_ORDER.map((weekday) => [weekday, 0])
  );
  const parties = PARTY_SIZES.map((size) => ({
    ...size,
    count: 0,
  }));

  let reservationCount = 0;
  let covers = 0;
  let cameCount = 0;
  let pastCount = 0;
  let missedCount = 0;
  let cancelledCount = 0;
  let upcomingCount = 0;
  let walkInCount = 0;
  let aiCount = 0;

  const guestsInPeriod = [];

  guests.forEach((guest) => {
    const reservations = guest.reservations ?? [];

    const inPeriod = reservations.filter((reservation) =>
      daySet.has(toDateString(new Date(reservation.startTime)))
    );

    if (inPeriod.length === 0) {
      return;
    }

    let guestCount = 0;
    let guestMissed = 0;
    let guestCovers = 0;

    inPeriod.forEach((reservation) => {
      if (reservation.status === "CANCELLED") {
        cancelledCount += 1;
        return;
      }

      const start = new Date(reservation.startTime);
      const day = toDateString(start);
      const missed = isMissed(reservation, now);

      reservationCount += 1;
      guestCount += 1;

      if (reservation.source === "WALK_IN") {
        walkInCount += 1;
      } else if (reservation.source === "AI") {
        aiCount += 1;
      }

      if (start <= now) {
        pastCount += 1;
      } else {
        upcomingCount += 1;
      }

      if (missed) {
        missedCount += 1;
        guestMissed += 1;
        return;
      }

      // Covers count the guests who came or will come.
      covers += reservation.guestCount;
      guestCovers += reservation.guestCount;

      if (
        reservation.status === "SEATED" ||
        reservation.status === "COMPLETED"
      ) {
        cameCount += 1;
      }

      const dayTotals = perDay.get(day);
      dayTotals.covers += reservation.guestCount;
      dayTotals.count += 1;

      const service =
        servicesForDay(openingHours, day).find((item) =>
          isInsideService(reservation, item)
        )?.title ??
        (start.getHours() < 16
          ? "Middagservice"
          : "Avondservice");
      const serviceTotals = services.get(service) ?? {
        name: service,
        covers: 0,
        count: 0,
        firstMinute: Infinity,
      };
      serviceTotals.firstMinute = Math.min(
        serviceTotals.firstMinute,
        start.getHours() * 60 + start.getMinutes()
      );
      serviceTotals.covers += reservation.guestCount;
      serviceTotals.count += 1;
      services.set(service, serviceTotals);

      hours.set(
        start.getHours(),
        (hours.get(start.getHours()) ?? 0) + 1
      );

      weekdays.set(
        start.getDay(),
        weekdays.get(start.getDay()) + reservation.guestCount
      );

      parties.find(
        (size) => reservation.guestCount <= size.max
      ).count += 1;
    });

    // Walk-ins and other bookings without a guest count
    // in the totals, not as a guest.
    if (guestCount === 0 || guest.anonymous) {
      return;
    }

    // New: no reservation before this period.
    const firstDay = days[0];
    const isNew = !reservations.some(
      (reservation) =>
        reservation.status !== "CANCELLED" &&
        toDateString(new Date(reservation.startTime)) <
          firstDay
    );

    guestsInPeriod.push({
      id: guest.id,
      name: guestName(guest),
      count: guestCount,
      covers: guestCovers,
      missed: guestMissed,
      isNew,
    });
  });

  const newGuestCount = guestsInPeriod.filter(
    (guest) => guest.isNew
  ).length;

  return {
    days: days.map((day) => perDay.get(day)),
    reservationCount,
    covers,
    cameCount,
    upcomingCount,
    walkInCount,
    aiCount,
    averageParty:
      reservationCount - missedCount > 0
        ? covers / (reservationCount - missedCount)
        : 0,
    missedCount,
    missedRate: pastCount > 0 ? missedCount / pastCount : 0,
    cancelledCount,
    cancelledRate:
      reservationCount + cancelledCount > 0
        ? cancelledCount / (reservationCount + cancelledCount)
        : 0,
    guestCount: guestsInPeriod.length,
    newGuestCount,
    returningRate: guestsInPeriod.length
      ? (guestsInPeriod.length - newGuestCount) /
        guestsInPeriod.length
      : 0,
    // In the order of the day: lunch before dinner.
    services: [...services.values()].sort(
      (a, b) => a.firstMinute - b.firstMinute
    ),
    hours: [...hours.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([hour, count]) => ({ hour, count })),
    weekdays: WEEKDAY_ORDER.map((weekday) => ({
      label: WEEKDAYS[weekday],
      covers: weekdays.get(weekday),
    })),
    parties,
    topGuests: [...guestsInPeriod]
      .filter((guest) => guest.count - guest.missed > 0)
      .sort(
        (a, b) =>
          b.count - b.missed - (a.count - a.missed) ||
          b.covers - a.covers
      )
      .slice(0, 5),
    missedGuests: guestsInPeriod
      .filter((guest) => guest.missed > 0)
      .sort((a, b) => b.missed - a.missed)
      .slice(0, 5),
  };
}

export default function useRestaurantAnalytics(days) {
  const { business, accessToken } = useAuth();

  const {
    guests,
    otherReservations,
    progress,
    error: guestError,
  } = useGuestHistory();

  const [openingHours, setOpeningHours] = useState([]);

  useFocusEffect(
    useCallback(() => {
      if (!business?.id) {
        return;
      }

      api
        .getOpeningHours(business.id, accessToken)
        .then((response) =>
          setOpeningHours(response?.data || response || [])
        )
        .catch(() => setOpeningHours([]));
    }, [business?.id, accessToken])
  );

  return {
    analytics: guests
      ? computeRestaurantAnalytics(
          days,
          [
            ...guests,
            {
              id: "other",
              anonymous: true,
              reservations: otherReservations,
            },
          ],
          openingHours
        )
      : null,
    isLoading: !guests && !guestError,
    progress,
    error: guestError,
  };
}
