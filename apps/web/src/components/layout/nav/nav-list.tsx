"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navIcons } from "@/components/layout/nav/nav-icons";
import { navItems } from "@/components/layout/nav/nav-items";

const listClassName = "flex flex-col gap-1";

// Horizontal padding lives in the variants, not here: a base px-3 and a variant
// px-0 are the same CSS property and the attribute's class order would not
// decide the winner.
const itemClassName =
  "flex items-center gap-3 rounded-md py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2";

const expandedItemClassName = "px-3";

// No px on this axis: the rail centres its icon instead of padding it.
const collapsedItemClassName = "justify-center";

// Collapsing hides the label from sight, not from the accessibility tree. The
// link's accessible name must stay "Students" at every width — a narrower
// column is no use to a screen-reader user and must not cost them the label.
const collapsedLabelClassName = "sr-only";

const currentItemClassName = "bg-zinc-950 text-white";

const otherItemClassName = "text-zinc-600 hover:bg-zinc-100";

export function NavList({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <ul className={listClassName}>
      {navItems.map((item) => {
        // Exact equality: revisit this when nested routes exist and a partial
        // match (.startsWith) is wanted. It would light up every route today,
        // because the only href is "/".
        const isCurrentPath = item.href === pathname;

        const Icon = navIcons[item.icon];

        return (
          <li key={item.key}>
            <Link
              href={item.href}
              className={`${itemClassName} ${collapsed ? collapsedItemClassName : expandedItemClassName} ${isCurrentPath ? currentItemClassName : otherItemClassName}`}
              aria-current={isCurrentPath ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              onClick={() => onNavigate?.()}
            >
              <Icon />
              <span className={collapsed ? collapsedLabelClassName : undefined}>
                {item.label}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
