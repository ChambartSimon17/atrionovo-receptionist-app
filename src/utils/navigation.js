// ======================================================
// Going back
// ======================================================
//
// router.back does nothing when there is no earlier
// screen, which happens in the browser after a page
// refresh or when a link is opened directly. Then go to
// the start screen ("/" sends a logged-in owner home).
// ======================================================

export function goBack(router) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/");
  }
}
