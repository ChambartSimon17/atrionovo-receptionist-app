import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";

import { useAuth } from "../context/auth-context";
import { api } from "../services/api";
import TableMap from "../components/TableMap";

// ======================================================
// Helpers
// ======================================================

function parseDateParam(dateParam) {
  if (!dateParam) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] = String(dateParam)
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0
  );
}

function getMinutesSinceMidnight(
  date,
  timezone
) {
  const formatter =
    new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const parts =
    formatter.formatToParts(date);

  const hour = Number(
    parts.find(
      (part) =>
        part.type === "hour"
    ).value
  );

  const minute = Number(
    parts.find(
      (part) =>
        part.type === "minute"
    ).value
  );

  return hour * 60 + minute;
}

function minutesToTime(minutes) {
  const hours = Math.floor(
    minutes / 60
  );

  const mins = minutes % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(mins).padStart(
    2,
    "0"
  )}`;
}

function formatTime(
  date,
  timezone
) {
  return date.toLocaleTimeString(
    "nl-BE",
    {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  );
}

function formatDate(
  date,
  timezone
) {
  return date.toLocaleDateString(
    "nl-BE",
    {
      timeZone: timezone,
      weekday: "long",
      day: "numeric",
      month: "long",
    }
  );
}

function formatApiDate(
  date,
  timezone
) {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );

  const parts =
    formatter.formatToParts(date);

  const year = parts.find(
    (part) =>
      part.type === "year"
  ).value;

  const month = parts.find(
    (part) =>
      part.type === "month"
  ).value;

  const day = parts.find(
    (part) =>
      part.type === "day"
  ).value;

  return `${year}-${month}-${day}`;
}

function formatGuestCount(count) {
  if (count === 1) {
    return "1 persoon";
  }

  return `${count} personen`;
}

// ======================================================
// Date navigation helper
// ======================================================

function changeCalendarDay(
  date,
  amount
) {
  const nextDate =
    new Date(date);

  nextDate.setDate(
    nextDate.getDate() + amount
  );

  return nextDate;
}

// ======================================================
// Weekday helper
// ======================================================

function getDayOfWeekKey(
  date,
  timezone
) {
  const weekday =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: timezone,
        weekday: "long",
      }
    ).format(date);

  return weekday.toUpperCase();
}

// ======================================================
// Service helpers
// ======================================================

function isReservationInsideService(
  reservation,
  service,
  timezone
) {
  const date =
    new Date(
      reservation.startTime
    );

  const minutes =
    getMinutesSinceMidnight(
      date,
      timezone
    );

  return (
    minutes >=
      service.startMinutes &&
    minutes <
      service.endMinutes
  );
}

function createServicesForDay(
  openingHours
) {
  if (!openingHours?.length) {
    return [];
  }

  const sortedOpeningHours = [
    ...openingHours,
  ].sort(
    (a, b) =>
      a.opensAtMinutes -
      b.opensAtMinutes
  );

  // ====================================================
  // Eén opening period
  // ====================================================

  if (
    sortedOpeningHours.length === 1
  ) {
    const period =
      sortedOpeningHours[0];

    return [
      {
        key: "service-1",

        title: "Service 1",

        subtitle: `${minutesToTime(
          period.opensAtMinutes
        )} – ${minutesToTime(
          period.closesAtMinutes
        )}`,

        startMinutes:
          period.opensAtMinutes,

        endMinutes:
          period.closesAtMinutes,
      },
    ];
  }

  // ====================================================
  // Twee opening periods
  // ====================================================

  if (
    sortedOpeningHours.length === 2
  ) {
    return [
      {
        key: "lunch",

        title: "Middagservice",

        subtitle: `${minutesToTime(
          sortedOpeningHours[0]
            .opensAtMinutes
        )} – ${minutesToTime(
          sortedOpeningHours[0]
            .closesAtMinutes
        )}`,

        startMinutes:
          sortedOpeningHours[0]
            .opensAtMinutes,

        endMinutes:
          sortedOpeningHours[0]
            .closesAtMinutes,
      },

      {
        key: "dinner",

        title: "Avondservice",

        subtitle: `${minutesToTime(
          sortedOpeningHours[1]
            .opensAtMinutes
        )} – ${minutesToTime(
          sortedOpeningHours[1]
            .closesAtMinutes
        )}`,

        startMinutes:
          sortedOpeningHours[1]
            .opensAtMinutes,

        endMinutes:
          sortedOpeningHours[1]
            .closesAtMinutes,
      },
    ];
  }

  // ====================================================
  // Fallback voor meer dan 2 periods
  // ====================================================

  return sortedOpeningHours.map(
    (period, index) => ({
      key: `service-${
        index + 1
      }`,

      title: `Service ${
        index + 1
      }`,

      subtitle: `${minutesToTime(
        period.opensAtMinutes
      )} – ${minutesToTime(
        period.closesAtMinutes
      )}`,

      startMinutes:
        period.opensAtMinutes,

      endMinutes:
        period.closesAtMinutes,
    })
  );
}

// ======================================================
// Reservation Card
// ======================================================

function ReservationCard({
  reservation,
  timezone,
  onSeat,
  onComplete,
  isActionInProgress,
}) {
  const startTime =
    new Date(
      reservation.startTime
    );

  const isSeated =
    reservation.status ===
    "SEATED";

  return (
    <View
      style={[
        styles.reservationCard,

        isSeated &&
          styles.seatedReservationCard,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        style={
          styles.reservationTouchable
        }
        onPress={() =>
          router.push(
            `/reservation/${reservation.id}`
          )
        }
      >
        <View
          style={
            styles.timeColumn
          }
        >
          <Text
            style={
              styles.reservationTime
            }
          >
            {formatTime(
              startTime,
              timezone
            )}
          </Text>
        </View>

        <View
          style={
            styles.reservationMain
          }
        >
          <Text
            style={
              styles.reservationName
            }
            numberOfLines={1}
          >
            {reservation.firstName}{" "}
            {reservation.lastName}
          </Text>

          <Text
            style={
              styles.reservationMeta
            }
          >
            {formatGuestCount(
              reservation.guestCount
            )}
          </Text>
        </View>
      </TouchableOpacity>

      <View
        style={
          styles.reservationAction
        }
      >
        {isSeated ? (
          <TouchableOpacity
            activeOpacity={0.75}
            disabled={isActionInProgress}
            style={[
              styles.departedButton,
              isActionInProgress &&
                styles.departedButtonDisabled,
            ]}
            onPress={() =>
              onComplete(
                reservation
              )
            }
          >
            {isActionInProgress ? (
              <ActivityIndicator
                size="small"
              />
            ) : (
              <Text
                style={
                  styles.departedButtonText
                }
              >
                Gasten vertrokken
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.75}
            disabled={isActionInProgress}
            style={[
              styles.arrivedButton,

              isActionInProgress &&
                styles.arrivedButtonDisabled,
            ]}
            onPress={() =>
              onSeat(
                reservation
              )
            }
          >
            {isActionInProgress ? (
              <ActivityIndicator
                size="small"
              />
            ) : (
              <Text
                style={
                  styles.arrivedButtonText
                }
              >
                Gast gearriveerd
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ======================================================
// Service Section
// ======================================================

function ServiceSection({
  service,
  reservations,
  timezone,
  onSeat,
  onComplete,
  activeReservationActionId,
}) {
  return (
    <View
      style={
        styles.serviceSection
      }
    >
      <View
        style={
          styles.serviceHeader
        }
      >
        <View>
          <Text
            style={
              styles.serviceTitle
            }
          >
            {service.title}
          </Text>

          <Text
            style={
              styles.serviceSubtitle
            }
          >
            {service.subtitle}
          </Text>
        </View>

        <View
          style={
            styles.serviceCount
          }
        >
          <Text
            style={
              styles.serviceCountNumber
            }
          >
            {reservations.length}
          </Text>

          <Text
            style={
              styles.serviceCountLabel
            }
          >
            {reservations.length ===
            1
              ? "reservatie"
              : "reservaties"}
          </Text>
        </View>
      </View>

      {reservations.length ===
      0 ? (
        <View
          style={
            styles.emptyService
          }
        >
          <Text
            style={
              styles.emptyServiceText
            }
          >
            Geen reservaties
          </Text>
        </View>
      ) : (
        <View
          style={
            styles.reservationList
          }
        >
          {reservations.map(
            (reservation) => (
              <ReservationCard
                key={
                  reservation.id
                }
                reservation={
                  reservation
                }
                timezone={
                  timezone
                }
                onSeat={
                  onSeat
                }
                onComplete={
                  onComplete
                }
                isActionInProgress={
                  activeReservationActionId ===
                  reservation.id
                }
              />
            )
          )}
        </View>
      )}
    </View>
  );
}

// ======================================================
// Dashboard
// ======================================================

export default function Dashboard() {
  const {
    date: selectedDateParam,
  } = useLocalSearchParams();

  const {
    user,
    restaurant,
    accessToken,
    logout,
  } = useAuth();

  const { width } =
    useWindowDimensions();

  const isLandscape =
    width > 700;

  // ====================================================
  // Selected day
  // ====================================================

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(() => {
    return (
      parseDateParam(
        selectedDateParam
      ) || new Date()
    );
  });

  // ====================================================
  // Sync selected date with
  // calendar route parameter
  // ====================================================

  useEffect(() => {
    if (!selectedDateParam) {
      return;
    }

    const parsedDate =
      parseDateParam(
        selectedDateParam
      );

    if (parsedDate) {
      setSelectedDate(
        parsedDate
      );
    }
  }, [
    selectedDateParam,
  ]);

  // ====================================================
  // Restaurant timezone
  // ====================================================

  const timezone =
    restaurant?.timezone ||
    "Europe/Brussels";

  // ====================================================
  // Dashboard state
  // ====================================================

  const [
    reservations,
    setReservations,
  ] = useState([]);

  const [
    openingHours,
    setOpeningHours,
  ] = useState([]);

  const [
    tables,
    setTables,
  ] = useState([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState(null);

  const [
    isEditingFloorPlan,
    setIsEditingFloorPlan,
  ] = useState(false);

  const [
    selectedFloorPlanTable,
    setSelectedFloorPlanTable,
  ] = useState(null);

  // ====================================================
  // Reservation action state
  // ====================================================

  const [
    activeReservationActionId,
    setActiveReservationActionId,
  ] = useState(null);

  // ====================================================
  // Mark reservation as seated
  // ====================================================

  const handleSeatReservation =
    useCallback(
      async (reservation) => {
        if (
          !accessToken ||
          !restaurant?.id ||
          !reservation?.id
        ) {
          return;
        }

        if (
          reservation.status !==
          "CONFIRMED"
        ) {
          return;
        }

        try {
          setActiveReservationActionId(
            reservation.id
          );

          setError(null);

          const response =
            await api.markReservationAsSeated(
              restaurant.id,
              reservation.id,
              accessToken
            );

          const updatedReservation =
            response?.data ||
            response;

          setReservations(
            (currentReservations) =>
              currentReservations.map(
                (
                  currentReservation
                ) =>
                  currentReservation.id ===
                  reservation.id
                    ? {
                        ...currentReservation,
                        ...updatedReservation,
                        status:
                          "SEATED",
                      }
                    : currentReservation
              )
          );
        } catch (error) {
          console.error(
            "Failed to mark reservation as seated:",
            error
          );

          setError(
            error?.message ||
              "De reservatie kon niet als gearriveerd worden gemarkeerd."
          );
        } finally {
          setActiveReservationActionId(
            null
          );
        }
      },
      [
        accessToken,
        restaurant?.id,
      ]
    );

  const handleCompleteReservation =
    useCallback(
      async (reservation) => {
        if (
          !accessToken ||
          !restaurant?.id ||
          !reservation?.id
        ) {
          return;
        }

        if (
          reservation.status !==
          "SEATED"
        ) {
          return;
        }

        try {
          setActiveReservationActionId(
            reservation.id
          );
          setError(null);

          await api.markReservationAsCompleted(
            restaurant.id,
            reservation.id,
            accessToken
          );

          setReservations(
            (currentReservations) =>
              currentReservations.filter(
                (currentReservation) =>
                  currentReservation.id !==
                  reservation.id
              )
          );
        } catch (error) {
          console.error(
            "Failed to complete reservation:",
            error
          );

          setError(
            error?.message ||
              "De reservatie kon niet als voltooid worden gemarkeerd."
          );
        } finally {
          setActiveReservationActionId(
            null
          );
        }
      },
      [
        accessToken,
        restaurant?.id,
      ]
    );

  const handleTablePositionChange =
    useCallback(
      async (tableId, position) => {
        if (
          !accessToken ||
          !restaurant?.id
        ) {
          return;
        }

        try {
          await api.updateTable(
            restaurant.id,
            tableId,
            {
              x: position.x,
              y: position.y,
            },
            accessToken
          );

          setTables(
            (currentTables) =>
              currentTables.map(
                (table) =>
                  table.id === tableId
                    ? {
                        ...table,
                        x: position.x,
                        y: position.y,
                      }
                    : table
              )
          );
        } catch (error) {
          console.error(
            "Failed to update table position:",
            error
          );

          setError(
            error?.message ||
              "De tafelpositie kon niet worden opgeslagen."
          );
        }
      },
      [
        accessToken,
        restaurant?.id,
      ]
    );

  const handleAddTable =
    useCallback(
      async () => {
        if (
          !accessToken ||
          !restaurant?.id
        ) {
          return;
        }

        try {
          setError(null);

          const existingNames =
            new Set(
              tables.map(
                (table) =>
                  table.name
              )
            );

          let tableNumber = 1;

          while (
            existingNames.has(
              `Tafel ${tableNumber}`
            )
          ) {
            tableNumber += 1;
          }

          const newTable = {
            name: `Tafel ${tableNumber}`,
            capacity: 2,
            shape: "ROUND",
            x: 40,
            y: 40,
            width: 70,
            height: 70,
            rotation: 0,
            isActive: true,
          };

          const response =
            await api.createTable(
              restaurant.id,
              newTable,
              accessToken
            );

          const createdTable =
            response?.data ||
            response;

          setTables(
            (currentTables) => [
              ...currentTables,
              createdTable,
            ]
          );
        } catch (error) {
          console.error(
            "Failed to create table:",
            error
          );

          setError(
            error?.message ||
              "De tafel kon niet worden toegevoegd."
          );
        }
      },
      [
        accessToken,
        restaurant?.id,
        tables,
      ]
    );

  const handleUpdateTable =
    useCallback(
      async (tableId, updates) => {
        if (
          !accessToken ||
          !restaurant?.id
        ) {
          return;
        }

        try {
          setError(null);

          const response =
            await api.updateTable(
              restaurant.id,
              tableId,
              updates,
              accessToken
            );

          const updatedTable =
            response?.data ||
            response;

          setTables(
            (currentTables) =>
              currentTables.map(
                (table) =>
                  table.id === tableId
                    ? {
                        ...table,
                        ...updatedTable,
                      }
                    : table
              )
          );

          setSelectedFloorPlanTable(
            (currentTable) =>
              currentTable?.id === tableId
                ? {
                    ...currentTable,
                    ...updatedTable,
                  }
                : currentTable
          );
        } catch (error) {
          console.error(
            "Failed to update table:",
            error
          );

          setError(
            error?.message ||
              "De tafel kon niet worden bijgewerkt."
          );
        }
      },
      [
        accessToken,
        restaurant?.id,
      ]
    );

  const handleDeactivateTable =
    useCallback(
      async (tableId) => {
        if (
          !accessToken ||
          !restaurant?.id
        ) {
          return;
        }

        try {
          setError(null);

          await api.deleteTable(
            restaurant.id,
            tableId,
            accessToken
          );

          setTables(
            (currentTables) =>
              currentTables.filter(
                (table) =>
                  table.id !== tableId
              )
          );

          setSelectedFloorPlanTable(
            null
          );
        } catch (error) {
          console.error(
            "Failed to deactivate table:",
            error
          );

          if (error?.status === 409) {
            setError(error.message);
            return;
          }

          setError(
            error?.message ||
              "De tafel kon niet worden gedeactiveerd."
          );
        }
      },
      [
        accessToken,
        restaurant?.id,
      ]
    );

  const handleConfirmDeactivateTable =
    useCallback(
      (table) => {
        Alert.alert(
          "Tafel deactiveren?",
          `Weet je zeker dat je ${table.name} wilt deactiveren? Bestaande reservaties blijven bewaard.`,
          [
            {
              text: "Annuleren",
              style: "cancel",
            },
            {
              text: "Deactiveren",
              style: "destructive",
              onPress: () =>
                handleDeactivateTable(
                  table.id
                ),
            },
          ]
        );
      },
      [handleDeactivateTable]
    );

  // ====================================================
  // Fetch dashboard data
  // ====================================================

  const loadDashboard =
    useCallback(
      async (
        refresh = false,
        dateOverride = null
      ) => {
        if (!accessToken) {
          return;
        }

        try {
          if (refresh) {
            setIsRefreshing(
              true
            );
          } else {
            setIsLoading(true);
          }

          setError(null);

          // ==============================================
          // Restaurant
          // ==============================================

          const restaurantResponse =
            await api.getMyRestaurant(
              accessToken
            );

          const restaurantData =
            restaurantResponse?.data ||
            restaurantResponse;

          const restaurantTimezone =
            restaurantData.timezone ||
            "Europe/Brussels";

          // ==============================================
          // Selected date
          // ==============================================

          const currentSelectedDate =
            dateOverride ||
            selectedDate;

          // ==============================================
          // Restaurant local date
          // ==============================================

          const localDate =
            formatApiDate(
              currentSelectedDate,
              restaurantTimezone
            );

          // ==============================================
          // Reservations + opening hours + tables
          // ==============================================

          const [
            reservationsResponse,
            openingHoursResponse,
            tablesResponse,
          ] = await Promise.all([
            api.getReservationsForDay(
              localDate,
              accessToken
            ),

            api.getOpeningHours(
              restaurantData.id,
              accessToken
            ),

            api.getTables(
              restaurantData.id,
              accessToken
            ),
          ]);

          const reservationsData =
            reservationsResponse?.data ||
            [];

          const openingHoursData =
            openingHoursResponse?.data ||
            openingHoursResponse ||
            [];

          const tablesData =
            tablesResponse?.data ||
            tablesResponse ||
            [];

          console.log(
            "DASHBOARD LOCAL DATE:",
            localDate
          );

          console.log(
            "DASHBOARD RESERVATIONS:",
            JSON.stringify(
              reservationsData,
              null,
              2
            )
          );

          setReservations(
            reservationsData
          );

          setOpeningHours(
            openingHoursData
          );

          setTables(
            tablesData
          );
        } catch (error) {
          console.error(
            "Failed to load dashboard:",
            error
          );

          setError(
            error?.message ||
              "De dashboardgegevens konden niet worden geladen."
          );
        } finally {
          setIsLoading(false);
          setIsRefreshing(
            false
          );
        }
      },
      [
        accessToken,
        selectedDate,
        selectedDateParam,
      ]
    );

  // ====================================================
  // Reload when dashboard gets focus
  // ====================================================

  useFocusEffect(
    useCallback(() => {
      loadDashboard(true);
    }, [loadDashboard])
  );

  // ====================================================
  // Automatic refresh every minute
  // ====================================================

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const interval =
      setInterval(() => {
        loadDashboard(true);
      }, 60 * 1000);

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    accessToken,
    loadDashboard,
  ]);

  // ====================================================
  // Navigate to previous day
  // ====================================================

  const goToPreviousDay =
    useCallback(() => {
      setSelectedDate(
        (currentDate) => {
          return changeCalendarDay(
            currentDate,
            -1
          );
        }
      );
    }, []);

  // ====================================================
  // Navigate to next day
  // ====================================================

  const goToNextDay =
    useCallback(() => {
      setSelectedDate(
        (currentDate) => {
          return changeCalendarDay(
            currentDate,
            1
          );
        }
      );
    }, []);

  // ====================================================
  // Selected date is today?
  // ====================================================

  const isToday =
    useMemo(() => {
      const today =
        new Date();

      return (
        formatApiDate(
          selectedDate,
          timezone
        ) ===
        formatApiDate(
          today,
          timezone
        )
      );
    }, [
      selectedDate,
      timezone,
    ]);

  // ====================================================
  // Opening hours for selected day
  // ====================================================

  const selectedDayOpeningHours =
    useMemo(() => {
      const selectedDayKey =
        getDayOfWeekKey(
          selectedDate,
          timezone
        );

      return openingHours
        .filter(
          (openingHour) =>
            openingHour.dayOfWeek ===
            selectedDayKey
        )
        .sort(
          (a, b) =>
            a.opensAtMinutes -
            b.opensAtMinutes
        );
    }, [
      openingHours,
      selectedDate,
      timezone,
    ]);

  // ====================================================
  // Services for selected day
  // ====================================================

  const selectedDayServices =
    useMemo(() => {
      return createServicesForDay(
        selectedDayOpeningHours
      );
    }, [
      selectedDayOpeningHours,
    ]);

  // ====================================================
  // Selected day's reservations
  // ====================================================

  const selectedDayReservations =
    useMemo(() => {
      return [...reservations]
        .filter(
          (reservation) =>
            reservation.status ===
              "CONFIRMED" ||
            reservation.status ===
              "SEATED"
        )
        .sort(
          (a, b) =>
            new Date(
              a.startTime
            ) -
            new Date(
              b.startTime
            )
        );
    }, [
      reservations,
    ]);

  // ====================================================
  // Reservations grouped by service
  // ====================================================

  const reservationsByService =
    useMemo(() => {
      return selectedDayServices.map(
        (service) => ({
          service,

          reservations:
            selectedDayReservations.filter(
              (reservation) =>
                isReservationInsideService(
                  reservation,
                  service,
                  timezone
                )
            ),
        })
      );
    }, [
      selectedDayServices,
      selectedDayReservations,
      timezone,
    ]);

  // ====================================================
  // Total reservations
  // ====================================================

  const totalReservations =
    selectedDayReservations.length;

  // ====================================================
  // Loading
  // ====================================================

  if (isLoading) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Reservaties laden...
        </Text>
      </SafeAreaView>
    );
  }

  // ====================================================
  // Dashboard
  // ====================================================

  return (
    <SafeAreaView
      style={
        styles.container
      }
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,

          isLandscape &&
            styles.scrollContentLandscape,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={
              isRefreshing
            }
            onRefresh={() =>
              loadDashboard(true)
            }
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* ============================================
            Header
        ============================================ */}

        <View
          style={
            styles.header
          }
        >
          <View>
            <Text
              style={
                styles.logo
              }
            >
              AtrioNovo
            </Text>

            <Text
              style={
                styles.greeting
              }
            >
              Welkom,{" "}
              {user?.firstName ||
                "gebruiker"}
            </Text>

            <Text
              style={
                styles.restaurantName
              }
            >
              {restaurant?.name ||
                ""}
            </Text>
          </View>

          {/* ==========================================
              Header actions
          ========================================== */}

          <View
            style={
              styles.headerActions
            }
          >
            <TouchableOpacity
              style={
                styles.calendarButton
              }
              activeOpacity={0.7}
              onPress={() =>
                router.push(
                  "/calendar"
                )
              }
            >
              <Text
                style={
                  styles.calendarIcon
                }
              >
                ▦
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.settingsButton
              }
              activeOpacity={0.7}
              onPress={() =>
                router.push(
                  "/settings"
                )
              }
            >
              <Text
                style={
                  styles.settingsIcon
                }
              >
                ⚙
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================
            Date navigation
        ============================================ */}

        <View
          style={
            styles.dateNavigation
          }
        >
          <TouchableOpacity
            style={
              styles.dateNavigationButton
            }
            activeOpacity={0.7}
            onPress={
              goToPreviousDay
            }
          >
            <Text
              style={
                styles.dateNavigationArrow
              }
            >
              ‹
            </Text>
          </TouchableOpacity>

          <View
            style={
              styles.selectedDateContainer
            }
          >
            <Text
              style={
                styles.date
              }
            >
              {formatDate(
                selectedDate,
                timezone
              )}
            </Text>

            <Text
              style={
                styles.dateSubtitle
              }
            >
              {isToday
                ? "Vandaag"
                : "Reservaties"}
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.dateNavigationButton
            }
            activeOpacity={0.7}
            onPress={
              goToNextDay
            }
          >
            <Text
              style={
                styles.dateNavigationArrow
              }
            >
              ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* ============================================
            Date + total
        ============================================ */}

        <View
          style={
            styles.dateTotalRow
          }
        >
          <View>
            <Text
              style={
                styles.selectedDateLabel
              }
            >
              {isToday
                ? "Vandaag"
                : "Geselecteerde dag"}
            </Text>
          </View>

          <View
            style={
              styles.totalContainer
            }
          >
            <Text
              style={
                styles.totalNumber
              }
            >
              {totalReservations}
            </Text>

            <Text
              style={
                styles.totalLabel
              }
            >
              {totalReservations ===
              1
                ? "reservatie"
                : "reservaties"}
            </Text>
          </View>
        </View>

        {/* ============================================
            Error
        ============================================ */}

        {error && (
          <View
            style={
              styles.errorContainer
            }
          >
            <Text
              style={
                styles.errorTitle
              }
            >
              Er ging iets mis
            </Text>

            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>

            <TouchableOpacity
              style={
                styles.retryButton
              }
              onPress={() =>
                loadDashboard()
              }
            >
              <Text
                style={
                  styles.retryText
                }
              >
                Opnieuw proberen
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ============================================
            Service overview
        ============================================ */}

        {selectedDayServices.length >
          0 && (
          <View
            style={[
              styles.serviceOverview,

              isLandscape &&
                styles.serviceOverviewLandscape,

              selectedDayServices.length ===
                1 &&
                styles.serviceOverviewSingle,
            ]}
          >
            {reservationsByService.map(
              ({
                service,
                reservations,
              }) => (
                <View
                  key={
                    service.key
                  }
                  style={[
                    styles.serviceOverviewCard,

                    isLandscape &&
                      styles.serviceOverviewCardLandscape,

                    selectedDayServices.length ===
                      1 &&
                      styles.serviceOverviewCardSingle,
                  ]}
                >
                  <Text
                    style={
                      styles.overviewLabel
                    }
                  >
                    {service.title}
                  </Text>

                  <Text
                    style={
                      styles.overviewNumber
                    }
                  >
                    {
                      reservations.length
                    }
                  </Text>

                  <Text
                    style={
                      styles.overviewSubtitle
                    }
                  >
                    {
                      service.subtitle
                    }
                  </Text>
                </View>
              )
            )}
          </View>
        )}

        {/* ============================================
            Closed today
        ============================================ */}

        {selectedDayServices.length ===
          0 && (
          <View
            style={
              styles.closedToday
            }
          >
            <Text
              style={
                styles.closedTodayTitle
              }
            >
              Gesloten
            </Text>

            <Text
              style={
                styles.closedTodayText
              }
            >
              Er zijn voor deze
              dag geen
              openingstijden
              ingesteld.
            </Text>
          </View>
        )}

        {/* ============================================
            Tables
        ============================================ */}

        <View
          style={
            styles.tablesSection
          }
        >
          <View
            style={
              styles.tablesHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Tafels
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                {tables.length} tafels
              </Text>
            </View>

            <View
              style={
                styles.floorPlanActions
              }
            >
              {isEditingFloorPlan && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={
                    handleAddTable
                  }
                  style={
                    styles.addTableButton
                  }
                >
                  <Text
                    style={
                      styles.addTableButtonText
                    }
                  >
                    + Tafel toevoegen
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  setIsEditingFloorPlan(
                    (current) => {
                      const nextValue =
                        !current;

                      if (!nextValue) {
                        setSelectedFloorPlanTable(
                          null
                        );
                      }

                      return nextValue;
                    }
                  )
                }
                style={
                  styles.floorPlanEditButton
                }
              >
                <Text
                  style={
                    styles.floorPlanEditButtonText
                  }
                >
                  {isEditingFloorPlan
                    ? "Klaar"
                    : "Bewerk vloerplan"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TableMap
            tables={tables}
            reservations={
              selectedDayReservations
            }
            isEditing={
              isEditingFloorPlan
            }
            onTablePositionChange={
              handleTablePositionChange
            }
            onTableSelect={
              setSelectedFloorPlanTable
            }
          />

          {isEditingFloorPlan &&
            selectedFloorPlanTable && (
              <View
                style={styles.tableEditor}
              >
                <Text
                  style={
                    styles.tableEditorTitle
                  }
                >
                  {selectedFloorPlanTable.name}
                </Text>

                <Text
                  style={
                    styles.tableEditorLabel
                  }
                >
                  Naam
                </Text>

                <TextInput
                  value={
                    selectedFloorPlanTable.name
                  }
                  onChangeText={(name) =>
                    setSelectedFloorPlanTable(
                      (current) => ({
                        ...current,
                        name,
                      })
                    )
                  }
                  style={
                    styles.tableEditorInput
                  }
                />

                <Text
                  style={
                    styles.tableEditorLabel
                  }
                >
                  Capaciteit
                </Text>

                <TextInput
                  value={String(
                    selectedFloorPlanTable.capacity
                  )}
                  onChangeText={(value) =>
                    setSelectedFloorPlanTable(
                      (current) => ({
                        ...current,
                        capacity: value,
                      })
                    )
                  }
                  keyboardType="number-pad"
                  style={
                    styles.tableEditorInput
                  }
                />

                <Text
                  style={
                    styles.tableEditorLabel
                  }
                >
                  Breedte
                </Text>

                <TextInput
                  value={String(
                    selectedFloorPlanTable.width
                  )}
                  onChangeText={(value) =>
                    setSelectedFloorPlanTable(
                      (current) => ({
                        ...current,
                        width: value,
                      })
                    )
                  }
                  keyboardType="number-pad"
                  style={
                    styles.tableEditorInput
                  }
                />

                <Text
                  style={
                    styles.tableEditorLabel
                  }
                >
                  Hoogte
                </Text>

                <TextInput
                  value={String(
                    selectedFloorPlanTable.height
                  )}
                  onChangeText={(value) =>
                    setSelectedFloorPlanTable(
                      (current) => ({
                        ...current,
                        height: value,
                      })
                    )
                  }
                  keyboardType="number-pad"
                  style={
                    styles.tableEditorInput
                  }
                />

                <Text
                  style={
                    styles.tableEditorLabel
                  }
                >
                  Vorm
                </Text>

                <View
                  style={
                    styles.shapeOptions
                  }
                >
                  {[
                    "ROUND",
                    "SQUARE",
                    "RECTANGLE",
                  ].map((shape) => (
                    <TouchableOpacity
                      key={shape}
                      activeOpacity={0.8}
                      onPress={() =>
                        setSelectedFloorPlanTable(
                          (current) => ({
                            ...current,
                            shape,
                          })
                        )
                      }
                      style={[
                        styles.shapeOption,
                        selectedFloorPlanTable.shape ===
                          shape &&
                          styles.shapeOptionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.shapeOptionText,
                          selectedFloorPlanTable.shape ===
                            shape &&
                            styles.shapeOptionTextSelected,
                        ]}
                      >
                        {shape}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={async () => {
                    const capacity = Number(
                      selectedFloorPlanTable.capacity
                    );

                    const width = Number(
                      selectedFloorPlanTable.width
                    );

                    const height = Number(
                      selectedFloorPlanTable.height
                    );

                    if (
                      !Number.isInteger(
                        capacity
                      ) ||
                      capacity <= 0
                    ) {
                      setError(
                        "De capaciteit moet een positief geheel getal zijn."
                      );
                      return;
                    }

                    if (
                      !Number.isFinite(width) ||
                      width <= 0
                    ) {
                      setError(
                        "De breedte moet groter zijn dan nul."
                      );
                      return;
                    }

                    if (
                      !Number.isFinite(height) ||
                      height <= 0
                    ) {
                      setError(
                        "De hoogte moet groter zijn dan nul."
                      );
                      return;
                    }

                    await handleUpdateTable(
                      selectedFloorPlanTable.id,
                      {
                        name:
                          selectedFloorPlanTable.name.trim(),
                        capacity,
                        shape:
                          selectedFloorPlanTable.shape,
                        width,
                        height,
                      }
                    );
                  }}
                  style={
                    styles.saveTableButton
                  }
                >
                  <Text
                    style={
                      styles.saveTableButtonText
                    }
                  >
                    Opslaan
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() =>
                    handleConfirmDeactivateTable(
                      selectedFloorPlanTable
                    )
                  }
                  style={
                    styles.deactivateTableButton
                  }
                >
                  <Text
                    style={
                      styles.deactivateTableButtonText
                    }
                  >
                    Tafel deactiveren
                  </Text>
                </TouchableOpacity>
              </View>
            )}
        </View>

        {/* ============================================
            Reservations
        ============================================ */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Reservaties
          </Text>

          <Text
            style={
              styles.sectionSubtitle
            }
          >
            {isToday
              ? "Vandaag"
              : formatDate(
                  selectedDate,
                  timezone
                )}
          </Text>
        </View>

        {reservationsByService.map(
          ({
            service,
            reservations,
          }) => (
            <ServiceSection
              key={
                service.key
              }
              service={service}
              reservations={
                reservations
              }
              timezone={
                timezone
              }
              onSeat={
                handleSeatReservation
              }
              onComplete={
                handleCompleteReservation
              }
              activeReservationActionId={
                activeReservationActionId
              }
            />
          )
        )}

        {/* ============================================
            Logout
        ============================================ */}

        <TouchableOpacity
          style={
            styles.logoutButton
          }
          onPress={async () => {
            await logout();

            router.replace(
              "/login"
            );
          }}
        >
          <Text
            style={
              styles.logoutText
            }
          >
            Uitloggen
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ======================================================
// Styles
// ======================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#f7f7f7",
    },

    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 40,
    },

    scrollContentLandscape: {
      paddingHorizontal: 40,
      maxWidth: 1200,
      width: "100%",
      alignSelf: "center",
    },

    // ==================================================
    // Loading
    // ==================================================

    loadingContainer: {
      flex: 1,
      backgroundColor:
        "#f7f7f7",
      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      marginTop: 12,
      fontSize: 15,
      color: "#666",
    },

    // ==================================================
    // Header
    // ==================================================

    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent:
        "space-between",
    },

    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    logo: {
      fontSize: 19,
      fontWeight: "700",
      color: "#111",
    },

    greeting: {
      fontSize: 30,
      fontWeight: "700",
      color: "#111",
      marginTop: 34,
    },

    restaurantName: {
      fontSize: 17,
      color: "#666",
      marginTop: 5,
    },

    calendarButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
    },

    calendarIcon: {
      fontSize: 25,
      color: "#111",
    },

    settingsButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#087FE5",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      elevation: 5,
    },

    settingsIcon: {
      fontSize: 25,
      color: "#fff",
    },

    // ==================================================
    // Date navigation
    // ==================================================

    dateNavigation: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginTop: 34,
    },

    dateNavigationButton: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
    },

    dateNavigationArrow: {
      fontSize: 34,
      lineHeight: 36,
      color: "#111",
      marginTop: -3,
    },

    selectedDateContainer: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 12,
    },

    date: {
      fontSize: 21,
      fontWeight: "700",
      color: "#111",
      textTransform:
        "capitalize",
      textAlign: "center",
    },

    dateSubtitle: {
      fontSize: 14,
      color: "#777",
      marginTop: 4,
    },

    // ==================================================
    // Date total
    // ==================================================

    dateTotalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginTop: 18,
    },

    selectedDateLabel: {
      fontSize: 14,
      color: "#777",
    },

    totalContainer: {
      alignItems: "flex-end",
    },

    totalNumber: {
      fontSize: 30,
      fontWeight: "700",
      color: "#111",
    },

    totalLabel: {
      fontSize: 13,
      color: "#777",
    },

    // ==================================================
    // Error
    // ==================================================

    errorContainer: {
      backgroundColor: "#fff",
      borderRadius: 16,
      padding: 20,
      marginTop: 24,
      borderWidth: 1,
      borderColor: "#f0cccc",
    },

    errorTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: "#c62828",
    },

    errorText: {
      fontSize: 14,
      color: "#666",
      marginTop: 6,
    },

    retryButton: {
      alignSelf: "flex-start",
      marginTop: 14,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
      backgroundColor: "#111",
    },

    retryText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "600",
    },

    // ==================================================
    // Service overview
    // ==================================================

    serviceOverview: {
      flexDirection: "row",
      gap: 14,
      marginTop: 28,
    },

    serviceOverviewSingle: {
      flexDirection: "column",
    },

    serviceOverviewLandscape: {
      gap: 20,
    },

    serviceOverviewCard: {
      flex: 1,
      backgroundColor: "#fff",
      borderRadius: 18,
      padding: 20,
      minHeight: 150,
      justifyContent: "center",
    },

    serviceOverviewCardLandscape: {
      minHeight: 170,
      padding: 26,
    },

    serviceOverviewCardSingle: {
      flex: 0,
    },

    overviewLabel: {
      fontSize: 17,
      fontWeight: "700",
      color: "#111",
    },

    overviewNumber: {
      fontSize: 42,
      fontWeight: "700",
      color: "#111",
      marginTop: 8,
    },

    overviewSubtitle: {
      fontSize: 14,
      color: "#777",
      marginTop: 2,
    },

    // ==================================================
    // Closed
    // ==================================================

    closedToday: {
      backgroundColor: "#fff",
      borderRadius: 18,
      padding: 20,
      marginTop: 28,
    },

    closedTodayTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: "#111",
    },

    closedTodayText: {
      fontSize: 14,
      color: "#777",
      marginTop: 5,
    },

    // ==================================================
    // Reservations header
    // ==================================================

    sectionHeader: {
      marginTop: 36,
      marginBottom: 16,
    },

    sectionTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: "#111",
    },

    sectionSubtitle: {
      fontSize: 14,
      color: "#777",
      marginTop: 3,
      textTransform:
        "capitalize",
    },

    // ==================================================
    // Tables
    // ==================================================

    tablesSection: {
      marginTop: 36,
      marginBottom: 10,
    },

    tablesHeader: {
      marginTop: 36,
      marginBottom: 16,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 16,
    },

    floorPlanActions: {
      alignItems: "flex-end",
      gap: 8,
    },

    addTableButton: {
      backgroundColor: "#087FE5",
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },

    addTableButtonText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "700",
    },

    tableEditor: {
      marginTop: 12,
      padding: 16,
      backgroundColor: "#ffffff",
      borderRadius: 16,
    },

    tableEditorTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#111827",
      marginBottom: 16,
    },

    tableEditorLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: "#6b7280",
      marginBottom: 6,
    },

    tableEditorInput: {
      height: 44,
      borderWidth: 1,
      borderColor: "#d1d5db",
      borderRadius: 10,
      paddingHorizontal: 12,
      fontSize: 15,
      color: "#111827",
      marginBottom: 14,
    },

    shapeOptions: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 16,
    },

    shapeOption: {
      flex: 1,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: "#d1d5db",
      borderRadius: 10,
      alignItems: "center",
    },

    shapeOptionSelected: {
      backgroundColor: "#111827",
      borderColor: "#111827",
    },

    shapeOptionText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#374151",
    },

    shapeOptionTextSelected: {
      color: "#ffffff",
    },

    saveTableButton: {
      backgroundColor: "#087FE5",
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },

    saveTableButtonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "700",
    },

    deactivateTableButton: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: "#dc2626",
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },

    deactivateTableButtonText: {
      color: "#dc2626",
      fontSize: 14,
      fontWeight: "700",
    },

    floorPlanEditButton: {
      backgroundColor: "#111827",
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },

    floorPlanEditButtonText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "700",
    },

    // ==================================================
    // Service
    // ==================================================

    serviceSection: {
      marginBottom: 30,
    },

    serviceHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 12,
    },

    serviceTitle: {
      fontSize: 19,
      fontWeight: "700",
      color: "#111",
    },

    serviceSubtitle: {
      fontSize: 13,
      color: "#777",
      marginTop: 3,
    },

    serviceCount: {
      alignItems: "flex-end",
    },

    serviceCountNumber: {
      fontSize: 21,
      fontWeight: "700",
      color: "#111",
    },

    serviceCountLabel: {
      fontSize: 12,
      color: "#777",
    },

    // ==================================================
    // Reservation list
    // ==================================================

    reservationList: {
      gap: 10,
    },

    reservationCard: {
      backgroundColor: "#fff",
      borderRadius: 14,
      minHeight: 76,
      paddingHorizontal: 16,
      paddingVertical: 13,
      flexDirection: "row",
      alignItems: "center",
    },

    seatedReservationCard: {
      borderWidth: 1,
      borderColor: "#b7dfc8",
    },

    reservationTouchable: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },

    timeColumn: {
      width: 62,
    },

    reservationTime: {
      fontSize: 17,
      fontWeight: "700",
      color: "#111",
    },

    reservationMain: {
      flex: 1,
      marginLeft: 8,
    },

    reservationName: {
      fontSize: 16,
      fontWeight: "600",
      color: "#111",
    },

    reservationMeta: {
      fontSize: 14,
      color: "#777",
      marginTop: 4,
    },

    reservationAction: {
      marginLeft: 10,
      alignItems: "flex-end",
    },

    arrivedButton: {
      backgroundColor: "#111",
      borderRadius: 9,
      paddingVertical: 9,
      paddingHorizontal: 12,
    },

    arrivedButtonDisabled: {
      opacity: 0.6,
    },

    arrivedButtonText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "600",
    },

    departedButton: {
      backgroundColor: "#e8f5e9",
      borderWidth: 1,
      borderColor: "#22a06b",
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },

    departedButtonDisabled: {
      opacity: 0.6,
    },

    departedButtonText: {
      color: "#16794f",
      fontSize: 14,
      fontWeight: "600",
    },

    // ==================================================
    // Empty service
    // ==================================================

    emptyService: {
      backgroundColor: "#fff",
      borderRadius: 14,
      paddingVertical: 24,
      paddingHorizontal: 20,
      alignItems: "center",
    },

    emptyServiceText: {
      fontSize: 14,
      color: "#999",
    },

    // ==================================================
    // Logout
    // ==================================================

    logoutButton: {
      backgroundColor: "#111",
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 10,
    },

    logoutText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
  });