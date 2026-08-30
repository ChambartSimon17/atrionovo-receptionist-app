import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
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
}) {
  const startTime =
    new Date(
      reservation.startTime
    );

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={
        styles.reservationCard
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

      <View
        style={
          styles.statusContainer
        }
      >
        <View
          style={
            styles.confirmedDot
          }
        />

        <Text
          style={
            styles.statusText
          }
        >
          Bevestigd
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ======================================================
// Service Section
// ======================================================

function ServiceSection({
  service,
  reservations,
  timezone,
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
          // Reservations + opening hours
          // ==============================================

          const [
            reservationsResponse,
            openingHoursResponse,
          ] = await Promise.all([
            api.getReservationsForDay(
              localDate,
              accessToken
            ),

            api.getOpeningHours(
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
            "CONFIRMED"
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

    statusContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 10,
    },

    confirmedDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#22a06b",
      marginRight: 6,
    },

    statusText: {
      fontSize: 12,
      color: "#777",
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