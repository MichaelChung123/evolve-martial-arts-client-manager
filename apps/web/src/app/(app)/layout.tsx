import { AppHeader } from "@/components/layout/header/app-header";
import { AppSidebar } from "@/components/layout/nav/app-sidebar";
import { requireCurrentUser } from "@/lib/auth-server";

// minmax(0,1fr) rather than a bare 1fr: a 1fr track refuses to shrink below its
// content's min-content width, which would let a wide student table push the
// grid sideways instead of scrolling inside its own column.
const shellClassName = "grid md:grid-cols-[16rem_minmax(0,1fr)]";

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
