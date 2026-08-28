import { describe, expect, it, vi } from "vitest";
import { generateReport, type MessagesClient } from "./call-claude.ts";
import type { ReleaseCheckInput } from "./build-prompt.ts";

const INPUT: ReleaseCheckInput = {
  workspaceAudit: [],
  pipAudit: [],
  webCoverage: { app: "web", actualPercent: 90, floorPercent: 60, passed: true },
  apiCoverage: { app: "api", actualPercent: 85, floorPercent: 60, passed: true },
};

describe("generateReport", () => {
  it("returns the narrative report on success", async () => {
    const client = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "## fix before release\nnone" }],
        }),
      },
    } as unknown as MessagesClient;

    const result = await generateReport(INPUT, client);

    expect(result.narrative).toBe(true);
    expect(result.markdown).toContain("fix before release");
  });

  it("falls back to a raw dump when the API call fails", async () => {
    const client = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error("simulated failure")),
      },
    } as unknown as MessagesClient;

    const result = await generateReport(INPUT, client);

    expect(result.narrative).toBe(false);
    expect(result.markdown).toContain("simulated failure");
    expect(result.markdown).toContain('"app": "web"');
  });

  it("falls back when the response has no text block", async () => {
    const client = {
      messages: {
        create: vi.fn().mockResolvedValue({ content: [] }),
      },
    } as unknown as MessagesClient;

    const result = await generateReport(INPUT, client);

    expect(result.narrative).toBe(false);
    expect(result.markdown).toContain("no text block");
  });
});
