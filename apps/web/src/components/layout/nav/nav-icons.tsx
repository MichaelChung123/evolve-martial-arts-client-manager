import type { NavIconKey } from "@/components/layout/nav/nav-items";

// Outline glyphs on a 24x24 grid, drawn to match the stroke style already used
// for the mobile toggle in mobile-nav.tsx. Path data follows the Feather icon
// set (MIT). A dependency is not worth one glyph; if the count outgrows this
// file, only this file changes.
//
// aria-hidden is unconditional: every glyph sits beside a text label that is
// present in the DOM at every width, so the icon is always decorative.
const iconClassName = "h-5 w-5 shrink-0";

function UsersIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={iconClassName}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// Record<NavIconKey, ...> rather than a bare object: adding a key to NavIconKey
// without adding a glyph here fails typecheck.
export const navIcons: Record<NavIconKey, () => React.JSX.Element> = {
  users: UsersIcon,
};
