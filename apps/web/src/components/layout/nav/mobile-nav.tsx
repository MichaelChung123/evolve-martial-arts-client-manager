"use client";

import { useRef } from "react";

import { NavList } from "@/components/layout/nav/nav-list";

const triggerClassName =
  "flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 md:hidden";

// <dialog> ships centred with a border and auto margins. Reset those for a
// full-height left drawer. `backdrop:` styles the ::backdrop pseudo-element,
// which is the scrim. `md:hidden` covers resizing the viewport while open.
//
// Deliberately no padding here: handleDialogClick dismisses when the click
// target is the dialog itself, and padding is part of the dialog's own box. Any
// gap the contents do not cover would read as a backdrop click and close the
// drawer from the inside. The nav below carries the padding and fills the box.
const dialogClassName =
  "m-0 h-full max-h-none w-64 max-w-none border-r border-zinc-200 bg-white backdrop:bg-zinc-950/50 md:hidden";

const navClassName = "h-full p-4";

export function MobileNav() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openDrawer = () => {
    dialogRef.current?.showModal();
  };

  const closeDrawer = () => {
    dialogRef.current?.close();
  };

  const handleDialogClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      closeDrawer();
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation"
        aria-haspopup="dialog"
        className={triggerClassName}
        onClick={openDrawer}
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

      <dialog
        ref={dialogRef}
        className={dialogClassName}
        onClick={handleDialogClick}
      >
        <nav aria-label="Main" className={navClassName}>
          <NavList onNavigate={closeDrawer} />
        </nav>
      </dialog>
    </>
  );
}
