import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll } from "vitest";

// jsdom 30 ships HTMLDialogElement with attribute reflection but no methods.
// This double implements just enough for component tests: the `open` attribute
// and the `close` event. It is test-only and never shipped to a browser, and it
// verifies our wiring — not the browser's modal semantics (focus trapping,
// inertness, Escape), which jsdom cannot model at all.
//
// The explicit `this` parameters are required: these are assigned to a
// prototype rather than declared as methods, so `this` would otherwise be
// implicitly `any` under the strict TypeScript config.
beforeAll(() => {
  const dialog = window.HTMLDialogElement.prototype;

  dialog.show = function show(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };

  dialog.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };

  dialog.close = function close(this: HTMLDialogElement, returnValue?: string) {
    if (!this.hasAttribute("open")) {
      return;
    }
    this.removeAttribute("open");
    if (returnValue !== undefined) {
      this.returnValue = returnValue;
    }
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(() => {
  cleanup();
});
