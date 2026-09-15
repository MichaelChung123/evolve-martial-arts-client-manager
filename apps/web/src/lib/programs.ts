import { apiRequest } from "@/lib/api";
import type { CreateProgramInput, Program, ProgramStatus } from "@/types/program";

export function getPrograms(status: ProgramStatus = "active"): Promise<Program[]> {
  return apiRequest<Program[]>(`/api/programs?status=${status}`);
}

export function getProgram(programId: number): Promise<Program> {
  return apiRequest<Program>(`/api/programs/${programId}`);
}

export function createProgram(program: CreateProgramInput): Promise<Program> {
  return apiRequest<Program>("/api/programs", {
    method: "POST",
    body: JSON.stringify(program),
  });
}

export function archiveProgram(programId: number): Promise<Program> {
  return apiRequest<Program>(`/api/programs/${programId}/archive`, { method: "POST" });
}

export function restoreProgram(programId: number): Promise<Program> {
  return apiRequest<Program>(`/api/programs/${programId}/restore`, { method: "POST" });
}
