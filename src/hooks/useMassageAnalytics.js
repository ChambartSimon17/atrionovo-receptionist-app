import {
  useCallback,
  useState,
} from "react";

import { useFocusEffect } from "expo-router";

import { useAuth } from "../context/auth-context";
import { api } from "../services/api";
import { addDays } from "../utils/date";

// ======================================================
// useMassageAnalytics
// ======================================================
//
// The numbers of a massage business over a period (a list
// of "YYYY-MM-DD" days): revenue, appointments, no-shows,
// new and returning clients, the best-selling massages,
// the busiest therapists and hours.
//
// Computed in the app from the appointments of each day
// and the customer list, so it works with any backend
// that serves the day agenda. Customers are matched by
// phone number, which is unique per business.
// ======================================================

function emptyAnalytics(days) {
  return {
    days: days.map((day) => ({ day, revenueCents: 0, count: 0 })),
    completedRevenueCents: 0,
    plannedRevenueCents: 0,
    appointmentCount: 0,
    completedCount: 0,
    averageSpendCents: 0,
    noShowCount: 0,
    noShowRate: 0,
    missedRevenueCents: 0,
    cancelledCount: 0,
    clientCount: 0,
    newClientCount: 0,
    returningRate: 0,
    topServices: [],
    topTherapists: [],
    hours: [],
    noShowClients: [],
  };
}

export function computeAnalytics(days, appointmentsByDay, customers) {
  const result = emptyAnalytics(days);

  const firstDay = new Date(`${days[0]}T00:00:00`);
  const afterLastDay = new Date(
    `${addDays(days[days.length - 1], 1)}T00:00:00`
  );

  const customersByPhone = new Map(
    customers.map((customer) => [customer.phoneNumber, customer])
  );

  const services = new Map();
  const therapists = new Map();
  const hours = new Map();
  const clients = new Map();
  const noShowClients = new Map();

  days.forEach((day, index) => {
    (appointmentsByDay[index] ?? []).forEach((appointment) => {
      const price = appointment.priceCents ?? 0;
      const status = appointment.status;

      if (status === "CANCELLED") {
        result.cancelledCount += 1;
        return;
      }

      if (status === "NO_SHOW") {
        result.noShowCount += 1;
        result.missedRevenueCents += price;

        const entry = noShowClients.get(
          appointment.phoneNumber
        ) ?? {
          name: `${appointment.firstName} ${appointment.lastName}`,
          count: 0,
        };
        entry.count += 1;
        noShowClients.set(appointment.phoneNumber, entry);
        return;
      }

      // Confirmed or completed: it counts.
      result.appointmentCount += 1;
      result.days[index].count += 1;
      result.days[index].revenueCents += price;

      if (status === "COMPLETED") {
        result.completedCount += 1;
        result.completedRevenueCents += price;
      } else {
        result.plannedRevenueCents += price;
      }

      const service = services.get(appointment.serviceName) ?? {
        name: appointment.serviceName,
        count: 0,
        revenueCents: 0,
      };
      service.count += 1;
      service.revenueCents += price;
      services.set(appointment.serviceName, service);

      const therapist = therapists.get(
        appointment.therapistName
      ) ?? { name: appointment.therapistName, count: 0 };
      therapist.count += 1;
      therapists.set(appointment.therapistName, therapist);

      const hour = new Date(appointment.startTime).getHours();
      hours.set(hour, (hours.get(hour) ?? 0) + 1);

      clients.set(appointment.phoneNumber, true);
    });
  });

  result.averageSpendCents = result.completedCount
    ? Math.round(
        result.completedRevenueCents / result.completedCount
      )
    : 0;

  const attended = result.completedCount + result.noShowCount;

  result.noShowRate = attended
    ? result.noShowCount / attended
    : 0;

  result.clientCount = clients.size;

  result.newClientCount = [...clients.keys()].filter(
    (phone) => {
      const customer = customersByPhone.get(phone);

      if (!customer?.createdAt) {
        return false;
      }

      const created = new Date(customer.createdAt);

      return created >= firstDay && created < afterLastDay;
    }
  ).length;

  result.returningRate = result.clientCount
    ? (result.clientCount - result.newClientCount) /
      result.clientCount
    : 0;

  result.topServices = [...services.values()]
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 5);

  result.topTherapists = [...therapists.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  result.hours = [...hours.entries()]
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour - b.hour);

  result.noShowClients = [...noShowClients.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return result;
}

export default function useMassageAnalytics(days) {
  const { business, accessToken } = useAuth();

  const businessId = business?.id;

  const [analytics, setAnalytics] = useState(() =>
    emptyAnalytics(days)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const key = days.join(",");

  useFocusEffect(
    useCallback(() => {
      if (!businessId) {
        return;
      }

      let cancelled = false;

      setIsLoading(true);
      setError(null);

      Promise.all([
        Promise.all(
          days.map((day) =>
            api
              .getMassageAppointments(businessId, day, accessToken)
              .then((response) => response.data)
          )
        ),
        api
          .getCustomers(accessToken)
          .then((response) => response?.data || response || [])
          .catch(() => []),
      ])
        .then(([appointmentsByDay, customers]) => {
          if (!cancelled) {
            setAnalytics(
              computeAnalytics(days, appointmentsByDay, customers)
            );
          }
        })
        .catch((loadError) => {
          if (!cancelled) {
            setError(
              loadError.message ||
                "De cijfers konden niet worden geladen."
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
      // days is described by key.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessId, accessToken, key])
  );

  return { analytics, isLoading, error };
}
