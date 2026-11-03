import {
  useCallback,
  useState,
} from "react";

import { Alert } from "react-native";

import { useFocusEffect } from "expo-router";

import { useAuth } from "../context/auth-context";
import { api } from "../services/api";

// ======================================================
// useDayAppointments
// ======================================================
//
// The massage appointments of one day ("YYYY-MM-DD"),
// reloaded whenever the screen comes back into view (for
// example after creating an appointment) and when the day
// changes.
//
// confirmStatus asks for confirmation and then marks a
// confirmed appointment as completed, no-show or
// cancelled.
// ======================================================

const STATUS_QUESTIONS = {
  COMPLETED: {
    title: "Afspraak afronden?",
    text: "De massage heeft plaatsgevonden.",
  },
  NO_SHOW: {
    title: "Niet verschenen?",
    text: "De klant is niet komen opdagen.",
  },
  CANCELLED: {
    title: "Afspraak annuleren?",
    text: "Het tijdstip komt weer vrij.",
  },
};

export default function useDayAppointments(date) {
  const { accessToken, business } = useAuth();

  const businessId = business?.id;

  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (day) => {
      try {
        setError(null);

        const response =
          await api.getMassageAppointments(
            businessId,
            day,
            accessToken
          );

        setAppointments(response.data);
      } catch (loadError) {
        setError(
          loadError.message ||
            "De afspraken konden niet worden geladen."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [businessId, accessToken]
  );

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load(date);
    }, [load, date])
  );

  async function changeStatus(appointment, status) {
    try {
      await api.updateMassageAppointment(
        businessId,
        appointment.id,
        { status },
        accessToken
      );

      await load(date);
    } catch (updateError) {
      Alert.alert(
        "Fout",
        updateError.message ||
          "De wijziging kon niet worden opgeslagen."
      );
    }
  }

  function confirmStatus(appointment, status) {
    const question = STATUS_QUESTIONS[status];

    Alert.alert(question.title, question.text, [
      { text: "Terug", style: "cancel" },
      {
        text: "Bevestigen",
        style:
          status === "CANCELLED"
            ? "destructive"
            : "default",
        onPress: () => changeStatus(appointment, status),
      },
    ]);
  }

  return {
    appointments,
    isLoading,
    error,
    reload: () => load(date),
    confirmStatus,
  };
}

/**
 * Whether an appointment still counts (not cancelled and
 * not a no-show).
 */
export function isActiveAppointment(appointment) {
  return (
    appointment.status !== "CANCELLED" &&
    appointment.status !== "NO_SHOW"
  );
}

/**
 * Whether a confirmed appointment is happening right now.
 */
export function isInProgress(appointment, now = new Date()) {
  return (
    appointment.status === "CONFIRMED" &&
    new Date(appointment.startTime) <= now &&
    now < new Date(appointment.endTime)
  );
}
