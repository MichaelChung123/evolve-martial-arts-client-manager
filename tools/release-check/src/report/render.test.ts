import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderReport } from "./render.ts";

describe("renderReport", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "release-check-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes the markdown to a timestamped file in the given directory", async () => {
    const filePath = await renderReport({ narrative: true, markdown: "# Hello" }, dir);

    expect(filePath.startsWith(dir)).toBe(true);
    expect(filePath.endsWith(".md")).toBe(true);
    await expect(readFile(filePath, "utf-8")).resolves.toBe("# Hello");
  });
});
