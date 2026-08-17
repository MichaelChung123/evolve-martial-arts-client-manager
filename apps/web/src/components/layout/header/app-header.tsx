import { AccountMenu } from "@/components/layout/header/account-menu";
import { HeaderBrand } from "@/components/layout/header/header-brand";
import { MobileNav } from "@/components/layout/nav/mobile-nav";

const headerClassName = "border-b border-zinc-200 bg-white";

// Full-bleed rather than the previous mx-auto max-w-6xl: the sidebar below is
// flush left, and a centred header would leave the brand inboard of its edge.
const innerClassName = "flex h-16 items-center justify-between px-6";

const leftClassName = "flex items-center gap-3";

export function AppHeader({ userEmail }: { userEmail: string }) {
  return (
    <header className={headerClassName}>
      <div className={innerClassName}>
        <div className={leftClassName}>
          <MobileNav />
          <HeaderBrand />
        </div>
        <AccountMenu userEmail={userEmail} />
      </div>
    </header>
  )
}
