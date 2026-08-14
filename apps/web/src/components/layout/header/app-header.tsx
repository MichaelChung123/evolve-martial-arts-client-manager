import { AccountMenu } from "@/components/layout/header/account-menu";
import { HeaderBrand } from "@/components/layout/header/header-brand";

const headerClassName = "border-b border-zinc-200 bg-white";

const innerClassName =
  "mx-auto flex h-16 max-w-6xl items-center justify-between px-6";

export function AppHeader({ userEmail }: { userEmail: string }) {
  return (
    <header className={headerClassName}>
      <div className={innerClassName}>
        <HeaderBrand />
        <AccountMenu userEmail={userEmail} />
      </div>
    </header>
  )
}
