// No "use client" directive. This file is only ever imported by app-sidebar.tsx,
// which has one — the directive marks the boundary, not every file past it.

// Pinned to the aside's right edge and straddling its border, which is why the
// aside needs `relative` and must not clip its overflow.
const buttonClassName =
  "absolute -right-3 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2";

const iconClassName =
  "h-4 w-4 transition-transform duration-200 motion-reduce:transition-none";

const collapsedIconClassName = "rotate-180";

export function SidebarToggle({
  collapsed,
  onToggle,
  controls,
}: {
  collapsed: boolean;
  onToggle: () => void;
  controls: string;
}) {
  return (
    <button
      type="button"
      aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
      aria-expanded={!collapsed}
      aria-controls={controls}
      className={buttonClassName}
      onClick={onToggle}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={`${iconClassName} ${collapsed ? collapsedIconClassName : ""}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}
