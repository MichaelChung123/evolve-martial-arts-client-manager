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

const currentItemClassName = "bg-zinc-950 text-white";

const otherItemClassName = "text-zinc-600 hover:bg-zinc-100";

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className={listClassName}>
      {navItems.map((item) => {
        // Exact equality: revisit this when nested routes exist and a partial
        // match (.startsWith) is wanted. It would light up every route today,
        // because the only href is "/".
        const isCurrentPath = item.href === pathname;

        // TODO(you): pull this item's glyph out of navIcons and render it as
        // the first child of the Link, before the label.
        //
        // Q: `navIcons[item.icon]` gives you a component. What has to be true
        //    of the variable you assign it to before you can write it as a JSX
        //    tag, and what does JSX emit if you get that wrong?

        const Icon = navIcons[item.icon];

        return (
          <li key={item.key}>
            <Link
              href={item.href}
              className={`${itemClassName} ${expandedItemClassName} ${isCurrentPath ? currentItemClassName : otherItemClassName}`}
              aria-current={isCurrentPath ? "page" : undefined}
              onClick={() => onNavigate?.()}
            >
              <Icon />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
