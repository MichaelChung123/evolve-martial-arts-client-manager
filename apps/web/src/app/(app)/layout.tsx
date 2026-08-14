import { AppHeader } from "@/components/layout/header/app-header";
import { requireCurrentUser } from "@/lib/auth-server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();
  return (
    <div>
      <AppHeader userEmail={user.email} />
      {children}
    </div>
  );
}
