import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  useRouter,
} from "expo-router";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useAuth,
} from "../context/auth-context";

import {
  api,
} from "../services/api";

// ======================================================
// Helpers
// ======================================================

function pad(value) {
  return String(value).padStart(
    2,
    "0"
  );
}

function formatDateKey(
  year,
  month,
  day
) {
  return `${year}-${pad(
    month
  )}-${pad(day)}`;
}

function getDaysInMonth(
  year,
  month
) {
  return new Date(
    year,
    month,
    0
  ).getDate();
}

function getFirstWeekday(
  year,
  month
) {
  const date =
    new Date(
      year,
      month - 1,
      1
    );

  const weekday =
    date.getDay();

  // Convert:
  // Sunday = 0
  // Monday = 1
  //
  // to:
  // Monday = 0
  // Sunday = 6

  return (
    weekday + 6
  ) % 7;
}

function getTodayKey() {
  const today =
    new Date();

  return formatDateKey(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );
}

function formatMonthTitle(
  year,
  month
) {
  return new Date(
    year,
    month - 1,
    1
  ).toLocaleDateString(
    "nl-BE",
    {
      month: "long",
      year: "numeric",
    }
  );
}

// ======================================================
// Calendar
// ======================================================

export default function Calendar() {
  const router =
    useRouter();

  const {
    accessToken,
  } = useAuth();

  const todayKey =
    useMemo(
      () => getTodayKey(),
      []
    );

  const today =
    new Date();

  const [
    displayedYear,
    setDisplayedYear,
  ] = useState(
    today.getFullYear()
  );

  const [
    displayedMonth,
    setDisplayedMonth,
  ] = useState(
    today.getMonth() + 1
  );

  const [
    reservationCounts,
    setReservationCounts,
  ] = useState({});

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState(null);

  // ====================================================
  // Load month
  // ====================================================

  useEffect(() => {
    async function loadMonth() {
      if (!accessToken) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response =
          await api.getReservationCountsForMonth(
            displayedYear,
            displayedMonth,
            accessToken
          );

        setReservationCounts(
          response?.data || {}
        );
      } catch (error) {
        console.error(
          "Failed to load reservation counts:",
          error
        );

        setError(
          error?.message ||
            "De kalender kon niet worden geladen."
        );
      } finally {
        setLoading(false);
      }
    }

    loadMonth();
  }, [
    accessToken,
    displayedYear,
    displayedMonth,
  ]);

  // ====================================================
  // Calendar days
  // ====================================================

  const calendarDays =
    useMemo(() => {
      const firstWeekday =
        getFirstWeekday(
          displayedYear,
          displayedMonth
        );

      const daysInMonth =
        getDaysInMonth(
          displayedYear,
          displayedMonth
        );

      const days = [];

      // Empty cells before first day
      for (
        let i = 0;
        i < firstWeekday;
        i++
      ) {
        days.push(null);
      }

      for (
        let day = 1;
        day <= daysInMonth;
        day++
      ) {
        days.push(day);
      }

      return days;
    }, [
      displayedYear,
      displayedMonth,
    ]);

  // ====================================================
  // Navigation
  // ====================================================

  function goToPreviousMonth() {
    if (
      displayedMonth === 1
    ) {
      setDisplayedYear(
        displayedYear - 1
      );

      setDisplayedMonth(
        12
      );

      return;
    }

    setDisplayedMonth(
      displayedMonth - 1
    );
  }

  function goToNextMonth() {
    if (
      displayedMonth === 12
    ) {
      setDisplayedYear(
        displayedYear + 1
      );

      setDisplayedMonth(
        1
      );

      return;
    }

    setDisplayedMonth(
      displayedMonth + 1
    );
  }

  function goToToday() {
    const now =
      new Date();

    setDisplayedYear(
      now.getFullYear()
    );

    setDisplayedMonth(
      now.getMonth() + 1
    );
  }

  // ====================================================
  // Open day
  // ====================================================

  function openDay(
    day
  ) {
    if (!day) {
      return;
    }

    const date =
      formatDateKey(
        displayedYear,
        displayedMonth,
        day
      );

    router.push({
      pathname:
        "/dashboard",
      params: {
        date,
      },
    });
  }

  // ====================================================
  // Render
  // ====================================================

  return (
    <SafeAreaView
      style={styles.container}
    >
      {/* ================================================
          Header
      ================================================= */}

      <View
        style={styles.header}
      >
        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={
              styles.backText
            }
          >
            ‹
          </Text>
        </TouchableOpacity>

        <Text
          style={
            styles.headerTitle
          }
        >
          Kalender
        </Text>

        <View
          style={
            styles.headerSpacer
          }
        />
      </View>

      {/* ================================================
          Month navigation
      ================================================= */}

      <View
        style={
          styles.monthHeader
        }
      >
        <TouchableOpacity
          style={
            styles.monthArrow
          }
          onPress={
            goToPreviousMonth
          }
        >
          <Text
            style={
              styles.arrowText
            }
          >
            ‹
          </Text>
        </TouchableOpacity>

        <View
          style={
            styles.monthTitleContainer
          }
        >
          <Text
            style={
              styles.monthTitle
            }
          >
            {formatMonthTitle(
              displayedYear,
              displayedMonth
            )}
          </Text>

          <TouchableOpacity
            onPress={
              goToToday
            }
          >
            <Text
              style={
                styles.todayButton
              }
            >
              Vandaag
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={
            styles.monthArrow
          }
          onPress={
            goToNextMonth
          }
        >
          <Text
            style={
              styles.arrowText
            }
          >
            ›
          </Text>
        </TouchableOpacity>
      </View>

      {/* ================================================
          Weekdays
      ================================================= */}

      <View
        style={
          styles.weekdayRow
        }
      >
        {[
          "MA",
          "DI",
          "WO",
          "DO",
          "VR",
          "ZA",
          "ZO",
        ].map(
          (weekday) => (
            <View
              key={
                weekday
              }
              style={
                styles.weekdayCell
              }
            >
              <Text
                style={
                  styles.weekdayText
                }
              >
                {weekday}
              </Text>
            </View>
          )
        )}
      </View>

      {/* ================================================
          Calendar
      ================================================= */}

      {loading ? (
        <View
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
            Kalender laden...
          </Text>
        </View>
      ) : error ? (
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
        </View>
      ) : (
        <View
          style={
            styles.calendarGrid
          }
        >
          {calendarDays.map(
            (day, index) => {
              if (!day) {
                return (
                  <View
                    key={`empty-${index}`}
                    style={
                      styles.dayCell
                    }
                  />
                );
              }

              const dateKey =
                formatDateKey(
                  displayedYear,
                  displayedMonth,
                  day
                );

              const count =
                reservationCounts[
                  dateKey
                ] || 0;

              const isToday =
                dateKey ===
                todayKey;

              return (
                <TouchableOpacity
                  key={
                    dateKey
                  }
                  activeOpacity={
                    0.7
                  }
                  style={[
                    styles.dayCell,
                    isToday &&
                      styles.todayCell,
                  ]}
                  onPress={() =>
                    openDay(
                      day
                    )
                  }
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isToday &&
                        styles.todayNumber,
                    ]}
                  >
                    {day}
                  </Text>

                  {count >
                    0 && (
                    <View
                      style={
                        styles.countBadge
                      }
                    >
                      <Text
                        style={
                          styles.countText
                        }
                      >
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }
          )}
        </View>
      )}
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
      paddingHorizontal: 24,
    },

    // ================================================
    // Header
    // ================================================

    header: {
      height: 70,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        "#fff",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    backText: {
      fontSize: 32,
      lineHeight: 32,
      marginTop: -4,
    },

    headerTitle: {
      fontSize: 20,
      fontWeight:
        "700",
      color: "#111",
    },

    headerSpacer: {
      width: 42,
    },

    // ================================================
    // Month
    // ================================================

    monthHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginTop: 16,
      marginBottom: 24,
    },

    monthArrow: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor:
        "#fff",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    arrowText: {
      fontSize: 32,
      lineHeight: 32,
      color: "#111",
      marginTop: -3,
    },

    monthTitleContainer: {
      alignItems:
        "center",
    },

    monthTitle: {
      fontSize: 22,
      fontWeight:
        "700",
      textTransform:
        "capitalize",
      color: "#111",
    },

    todayButton: {
      fontSize: 14,
      fontWeight:
        "600",
      color: "#087FE5",
      marginTop: 5,
    },

    // ================================================
    // Weekdays
    // ================================================

    weekdayRow: {
      flexDirection:
        "row",
      marginBottom: 8,
    },

    weekdayCell: {
      width: "14.2857%",
      alignItems:
        "center",
    },

    weekdayText: {
      fontSize: 12,
      fontWeight:
        "700",
      color: "#999",
    },

    // ================================================
    // Calendar
    // ================================================

    calendarGrid: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      backgroundColor:
        "#fff",
      borderRadius: 20,
      padding: 10,
    },

    dayCell: {
      width: "14.2857%",
      aspectRatio: 0.82,
      alignItems:
        "center",
      justifyContent:
        "flex-start",
      paddingTop: 10,
    },

    todayCell: {
      backgroundColor:
        "#087FE5",
      borderRadius: 14,
    },

    dayNumber: {
      fontSize: 16,
      fontWeight:
        "600",
      color: "#222",
    },

    todayNumber: {
      color: "#fff",
    },

    countBadge: {
      minWidth: 27,
      height: 27,
      borderRadius: 14,
      backgroundColor:
        "#eef5ff",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginTop: 7,
    },

    countText: {
      fontSize: 12,
      fontWeight:
        "700",
      color: "#087FE5",
    },

    // ================================================
    // Loading
    // ================================================

    loadingContainer: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    loadingText: {
      marginTop: 12,
      fontSize: 15,
      color: "#777",
    },

    // ================================================
    // Error
    // ================================================

    errorContainer: {
      backgroundColor:
        "#fff",
      borderRadius: 18,
      padding: 20,
      marginTop: 24,
    },

    errorTitle: {
      fontSize: 17,
      fontWeight:
        "700",
      color: "#c62828",
    },

    errorText: {
      fontSize: 14,
      color: "#777",
      marginTop: 6,
    },
  });