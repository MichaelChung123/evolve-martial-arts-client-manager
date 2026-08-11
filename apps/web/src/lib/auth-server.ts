import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError, apiRequest } from "@/lib/api";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { User } from "@/types/auth";

/**
 * Fetches the signed-in user for Server Components.
 *
 * `middleware.ts` guarantees a session cookie exists on authenticated routes,
 * but never checks that it is still valid — so this is where an expired or
 * revoked session gets caught.
 */
export async function requireCurrentUser(): Promise<User> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  try {
    return await apiRequest<User>("/api/auth/me", {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionCookie?.value}`,
      },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/login");
    }

    throw error;
  }
}
