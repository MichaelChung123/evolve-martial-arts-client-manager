"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/components/layout/nav/nav-items";

const listClassName = "flex flex-col gap-1";

const itemClassName =
  "block rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2";

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

        return (
          <li key={item.key}>
            <Link
              href={item.href}
              className={`${itemClassName} ${isCurrentPath ? currentItemClassName : otherItemClassName}`}
              aria-current={isCurrentPath ? "page" : undefined}
              onClick={() => onNavigate?.()}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
