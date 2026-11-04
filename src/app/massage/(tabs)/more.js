import {
  BedDouble,
  CalendarClock,
  Clock,
  HandHeart,
  Map,
  Store,
  UserRound,
} from "lucide-react-native";

import MoreScreen from "../../../components/MoreScreen";
import { t } from "../../../i18n";

// ======================================================
// Meer (salon)
// ======================================================

export default function MassageMoreScreen() {
  return (
    <MoreScreen
      analyticsHref="/massage/analytics"
      analyticsSubtitle={t("more.analyticsMassage")}
      settingsLinks={[
        {
          href: "/settings/business",
          icon: Store,
          title: t("business.titleMassage"),
          subtitle: t("more.businessMassage"),
        },
        {
          href: "/massage/services",
          icon: HandHeart,
          title: t("more.services"),
          subtitle: t("more.servicesSubtitle"),
        },
        {
          href: "/massage/therapists",
          icon: UserRound,
          title: t("more.therapists"),
          subtitle: t("more.therapistsSubtitle"),
        },
        {
          href: "/massage/rooms",
          icon: BedDouble,
          title: t("more.rooms"),
          subtitle: t("more.roomsSubtitle"),
        },
        {
          href: "/floor-plan/edit",
          icon: Map,
          title: t("more.floorPlanMassage"),
          subtitle: t("more.floorPlanMassageSubtitle"),
        },
        {
          href: "/settings/opening-hours",
          icon: Clock,
          title: t("hours.titleMassage"),
          subtitle: t("more.hoursMassage"),
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
