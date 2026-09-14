import Anthropic from "@anthropic-ai/sdk";
import { buildPrompt, type ReleaseCheckInput } from "./build-prompt.ts";

export interface ClaudeReportResult {
  narrative: boolean;
  markdown: string;
}

export type MessagesClient = Pick<Anthropic, "messages">;

export async function generateReport(
  input: ReleaseCheckInput,
  client: MessagesClient = new Anthropic(),
): Promise<ClaudeReportResult> {
  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      messages: [{ role: "user", content: buildPrompt(input) }],
    });

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );
    if (!textBlock) {
      throw new Error("Claude response contained no text block");
    }

    return { narrative: true, markdown: textBlock.text };
  } catch (error) {
    return { narrative: false, markdown: renderRawDump(input, error) };
  }
}

function describeError(error: unknown): string {
  // Only the distinction that changes what a reader would do about it —
  // network-level vs. an API-level response — is worth naming here. Finer
  // SDK subtypes (rate limit, auth, ...) all hit this same fallback below.
  if (error instanceof Anthropic.APIConnectionError) {
    return `network error: ${error.message}`;
  }
  if (error instanceof Anthropic.APIError) {
    return `API error ${error.status ?? "unknown"}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}

function renderRawDump(input: ReleaseCheckInput, error: unknown): string {
  const reason = describeError(error);

  return [
    "# Release Check — Raw Findings",
    "",
    `The Claude summarization step failed (${reason}), so this report shows`,
    "the unprioritized raw data instead.",
    "",
    "## npm/pnpm workspace dependency audit",
    "```json",
    JSON.stringify(input.workspaceAudit, null, 2),
    "```",
    "",
    "## pip dependency audit (apps/api)",
    "```json",
    JSON.stringify(input.pipAudit, null, 2),
    "```",
    "",
    "## apps/web test coverage",
    "```json",
    JSON.stringify(input.webCoverage, null, 2),
    "```",
    "",
    "## apps/api test coverage",
    "```json",
    JSON.stringify(input.apiCoverage, null, 2),
    "```",
  ].join("\n");
}
