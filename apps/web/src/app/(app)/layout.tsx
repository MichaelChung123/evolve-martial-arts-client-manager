import { cookies } from "next/headers";

import { AppHeader } from "@/components/layout/header/app-header";
import { AppSidebar } from "@/components/layout/nav/app-sidebar";
import { NAV_COLLAPSED_COOKIE } from "@/components/layout/nav/nav-preferences";
import { requireCurrentUser } from "@/lib/auth-server";

// The sidebar owns its width now, so the track sizes to it. minmax(0,1fr) stays
// for the original reason: a bare 1fr refuses to shrink below its content's
// min-content width, letting a wide student table push the grid sideways.
const shellClassName = "grid md:grid-cols-[auto_minmax(0,1fr)]";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();

  // Comparing the value to "1" rather than testing for the cookie's presence:
  // an explicitly expanded sidebar writes "0", which is present but must not
  // read as collapsed. Absent and "0" both have to mean expanded.
  const cookieStore = await cookies();
  const isNavCollapsed = cookieStore.get(NAV_COLLAPSED_COOKIE)?.value === "1";

  return (
    <div>
      <AppHeader userEmail={user.email} />
      <div className={shellClassName}>
        <AppSidebar defaultCollapsed={isNavCollapsed} />
        <div>{children}</div>
      </div>
    </div>
  );
}
