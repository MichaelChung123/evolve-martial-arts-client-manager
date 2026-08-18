// One definition, shared by the client that writes this cookie and the server
// component that reads it. Deliberately not httpOnly: the toggle sets it from
// the browser, and it holds a UI preference with no personal data in it.
export const NAV_COLLAPSED_COOKIE = "nav-collapsed";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export function navCollapsedCookie(collapsed: boolean): string {
  return [
    `${NAV_COLLAPSED_COOKIE}=${collapsed ? "1" : "0"}`,
    "path=/",
    `max-age=${ONE_YEAR_IN_SECONDS}`,
    "samesite=lax",
  ].join("; ");
}
