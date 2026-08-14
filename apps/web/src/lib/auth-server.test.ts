import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

// The real `redirect()` never returns — it throws a control-flow signal that
// Next catches. The mock throws too, so tests exercise the same control flow.
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  apiRequest: vi.fn(),
}));

const { cookies } = await import("next/headers");
const { redirect } = await import("next/navigation");
const { ApiError, apiRequest } = await import("@/lib/api");
const { requireCurrentUser } = await import("@/lib/auth-server");

const staffUser = {
  id: 1,
  email: "staff@evolve.test",
  created_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.mocked(cookies).mockResolvedValue({
    get: () => ({ name: "session_token", value: "abc123" }),
  } as unknown as Awaited<ReturnType<typeof cookies>>);
  vi.mocked(apiRequest).mockReset();
  vi.mocked(redirect).mockClear();
});

describe("requireCurrentUser", () => {
  it("forwards the session cookie to the API", async () => {
    vi.mocked(apiRequest).mockResolvedValue(staffUser);

    await requireCurrentUser();

    expect(apiRequest).toHaveBeenCalledWith("/api/auth/me", {
      headers: {
        Cookie: "session_token=abc123",
      },
    });
  });

  it("returns the user the API responds with", async () => {
    vi.mocked(apiRequest).mockResolvedValue(staffUser);

    const user = await requireCurrentUser();

    expect(user).toBe(staffUser);
  });

  it("redirects to /login when the session is rejected", async () => {
    vi.mocked(apiRequest).mockRejectedValue(new ApiError("Unauthorized", 401));

    // `redirect()` throws, so the call never returns normally. Assert on the
    // signal first, then on where it was pointed.
    await expect(requireCurrentUser()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("rethrows errors that are not 401", async () => {
    vi.mocked(apiRequest).mockRejectedValue(
      new ApiError("Internal Server Error", 500),
    );

    await expect(requireCurrentUser()).rejects.toThrow("Internal Server Error");

    expect(redirect).not.toHaveBeenCalled();
  });
});
