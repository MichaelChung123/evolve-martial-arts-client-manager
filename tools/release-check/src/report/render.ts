import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ClaudeReportResult } from "./call-claude.ts";
import { REPO_ROOT } from "../config.ts";

const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, "tools", "release-check", "output");

export async function renderReport(
  result: ClaudeReportResult,
  outputDir: string = DEFAULT_OUTPUT_DIR,
): Promise<string> {
  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(outputDir, `report-${timestamp}.md`);

  await writeFile(filePath, result.markdown, "utf-8");
  console.log(result.markdown);
  console.log(`\nReport written to ${filePath}`);

  return filePath;
}
