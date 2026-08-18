"use client";

import { useState } from "react";

import { NavList } from "@/components/layout/nav/nav-list";
import { navCollapsedCookie } from "@/components/layout/nav/nav-preferences";
import { SidebarToggle } from "@/components/layout/nav/sidebar-toggle";

// `relative` anchors the edge toggle; `hidden md:block` still removes the whole
// column below md, so the rail and its toggle never exist on mobile.
const asideClassName =
  "relative hidden shrink-0 border-r border-zinc-200 bg-white transition-[width] duration-200 motion-reduce:transition-none md:block";

const expandedAsideClassName = "md:w-64";

const collapsedAsideClassName = "md:w-16";

// Horizontal padding in the variants; py-4 is shared.
const navClassName = "py-4";

const expandedNavClassName = "px-4";

const collapsedNavClassName = "px-2";

const NAV_ID = "main-nav";

export function AppSidebar({ defaultCollapsed = false }: { defaultCollapsed?: boolean }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  // Derive the next value once and use that single value everywhere. `collapsed`
  // here is the snapshot from the render that created this closure, so deriving
  // it twice — once for setState, once for Task 4's cookie write — leaves two
  // expressions that must always agree. Naming it removes the possibility.
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);

    document.cookie = navCollapsedCookie(next);
  };

  return (
    <aside className={`${asideClassName} ${collapsed ? collapsedAsideClassName : expandedAsideClassName}`}>
      <SidebarToggle collapsed={collapsed} onToggle={toggleCollapsed} controls={NAV_ID} />
      <nav id={NAV_ID} aria-label="Main" className={`${navClassName} ${collapsed ? collapsedNavClassName : expandedNavClassName}`}>
        <NavList collapsed={collapsed} />
      </nav>
    </aside>
  );
}
