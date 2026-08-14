"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { logout } from "@/lib/auth";

const containerClassName = "relative";

const triggerClassName =
  "flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2";

const panelClassName =
  "absolute right-0 z-10 mt-2 w-64 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg";

const emailClassName = "truncate px-3 py-2 text-sm font-medium text-zinc-900";

const logoutClassName =
  "w-full rounded-md px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60";

const errorClassName = "px-3 py-2 text-sm text-red-700";

export function AccountMenu({ userEmail }: { userEmail: string }) {
  const [isOpened, setIsOpened] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      router.push("/login");
    }
  })

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpened(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpened(false);
        triggerRef.current?.focus();
      }
    }

    if (isOpened) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpened]);

  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div ref={menuRef} className={containerClassName}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Account menu"
        aria-controls={isOpened ? "account-menu-panel" : undefined}
        aria-expanded={isOpened}
        onClick={() => {
          setIsOpened(!isOpened);
        }}
        className={triggerClassName}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {isOpened && (
        <div id="account-menu-panel" className={panelClassName}>
          <p className={emailClassName}>{userEmail}</p>

          <hr className="my-1 border-zinc-200" />

          <button
            type="button"
            className={logoutClassName}
            onClick={() => mutate()}
            disabled={isPending}
          >
            {isPending ? "Logging out..." : "Log out"}
          </button>

          {error && (
            <p role="alert" className={errorClassName}>
              {error instanceof Error ? error.message : "Failed to log out."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
