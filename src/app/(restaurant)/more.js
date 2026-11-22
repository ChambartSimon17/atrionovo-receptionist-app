import {
  CalendarClock,
  Clock,
  CreditCard,
  FileText,
  LayoutGrid,
  Plug,
  ReceiptEuro,
  Store,
  UserRound,
  Users,
} from "lucide-react-native";

import MoreScreen from "../../components/MoreScreen";
import { t } from "../../i18n";

// ======================================================
// Meer (restaurant)
// ======================================================
//
// The same as a salon where it makes sense: guests,
// staff, receipts and invoices, Stripe, the business
// details, and the booking platforms (Zenchef and
// others) under Integraties.
// ======================================================

export default function RestaurantMoreScreen() {
  return (
    <MoreScreen
      analyticsHref="/analytics"
      analyticsSubtitle={t("more.analyticsRestaurant")}
      settingsLinks={[
        {
          href: "/customers",
          icon: Users,
          title: t("more.guests"),
          subtitle: t("more.guestsSubtitle"),
        },
        {
          href: "/massage/documents",
          icon: FileText,
          title: t("documents.title"),
          subtitle: t("documents.subtitle"),
        },
        {
          href: "/massage/invoicing",
          icon: ReceiptEuro,
          title: t("invoicing.title"),
          subtitle: t("invoicing.subtitle"),
        },
        {
          href: "/massage/payments",
          icon: CreditCard,
          title: t("payments.title"),
          subtitle: t("payments.subtitle"),
        },
        {
          href: "/settings/business",
          icon: Store,
          title: t("business.titleRestaurant"),
          subtitle: t("more.businessRestaurant"),
        },
        {
          href: "/massage/therapists",
          icon: UserRound,
          title: t("more.staff"),
          subtitle: t("more.staffSubtitle"),
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
        {
          href: "/massage/platforms",
          icon: Plug,
          title: t("more.integrations"),
          subtitle: t("more.platformsSubtitle"),
        },
      ]}
    />
  );
}
