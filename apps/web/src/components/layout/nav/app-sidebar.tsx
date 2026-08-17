import { NavList } from "@/components/layout/nav/nav-list";

// `hidden` below md removes this from the accessibility tree entirely, so it
// never coexists with the mobile drawer's nav landmark.
const asideClassName = "hidden border-r border-zinc-200 bg-white md:block";

const navClassName = "p-4";

export function AppSidebar() {
  return (
    <aside className={asideClassName}>
      <nav aria-label="Main" className={navClassName}>
        <NavList />
      </nav>
    </aside>
  );
}
