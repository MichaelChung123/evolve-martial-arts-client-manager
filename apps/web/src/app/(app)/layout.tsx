import { AppHeader } from "@/components/layout/header/app-header";
import { AppSidebar } from "@/components/layout/nav/app-sidebar";
import { requireCurrentUser } from "@/lib/auth-server";

// The sidebar owns its width now, so the track sizes to it. minmax(0,1fr) stays
// for the original reason: a bare 1fr refuses to shrink below its content's
// min-content width, letting a wide student table push the grid sideways.
const shellClassName = "grid md:grid-cols-[auto_minmax(0,1fr)]";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();
  return (
    <div>
      <AppHeader userEmail={user.email} />
      <div className={shellClassName}>
        <AppSidebar />
        <div>{children}</div>
      </div>
    </div>
  );
}
