import {
  CalendarClock,
  Clock,
  LayoutGrid,
  Store,
} from "lucide-react-native";

import MoreScreen from "../../components/MoreScreen";
import { t } from "../../i18n";

// ======================================================
// Meer (restaurant)
// ======================================================

export default function RestaurantMoreScreen() {
  return (
    <MoreScreen
      analyticsHref="/analytics"
      analyticsSubtitle={t("more.analyticsRestaurant")}
      settingsLinks={[
        {
          href: "/settings/business",
          icon: Store,
          title: t("business.titleRestaurant"),
          subtitle: t("more.businessRestaurant"),
        },
        {
          href: "/floor-plan/edit",
          icon: LayoutGrid,
          title: t("more.floorPlan"),
          subtitle: t("more.floorPlanRestaurant"),
        },
        {
          href: "/settings/opening-hours",
          icon: Clock,
          title: t("hours.title"),
          subtitle: t("more.hoursRestaurant"),
        },
        {
          href: "/settings/special-opening-days",
          icon: CalendarClock,
          title: t("special.title"),
          subtitle: t("more.special"),
        },
      ]}
    />
  );
}
