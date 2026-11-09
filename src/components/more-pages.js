import CallsScreen from "../app/calls/index";
import BusinessScreen from "../app/settings/business";
import OpeningHoursScreen from "../app/settings/opening-hours";
import SpecialOpeningDaysScreen from "../app/settings/special-opening-days";
import ClientsScreen from "../app/massage/clients";
import DocumentsScreen from "../app/massage/documents";
import InvoicingScreen from "../app/massage/invoicing";
import PaymentsScreen from "../app/massage/payments";
import ServicesScreen from "../app/massage/services";
import TherapistsScreen from "../app/massage/therapists";
import RoomsScreen from "../app/massage/rooms";

// ======================================================
// Pages that open next to Meer
// ======================================================
//
// On a tablet in landscape these Meer links open on the
// right of the Meer list instead of on their own screen.
// Links not listed here (the floor plan editor, Analyse)
// still open full screen.
// ======================================================

export const morePages = {
  "/calls": CallsScreen,
  "/settings/business": BusinessScreen,
  "/settings/opening-hours": OpeningHoursScreen,
  "/settings/special-opening-days": SpecialOpeningDaysScreen,
  "/massage/clients": ClientsScreen,
  "/massage/documents": DocumentsScreen,
  "/massage/invoicing": InvoicingScreen,
  "/massage/payments": PaymentsScreen,
  "/massage/services": ServicesScreen,
  "/massage/therapists": TherapistsScreen,
  "/massage/rooms": RoomsScreen,
};
