import { apiRequest } from "@/lib/api";
import type { Class, ClassStatus, CreateClassInput, UpdateClassInput } from "@/types/class";

export function getClasses(
  status: ClassStatus = "active",
  programId?: number,
): Promise<Class[]> {
  const params = new URLSearchParams({ status });
  if (programId !== undefined) {
    params.set("program_id", String(programId));
  }
  return apiRequest<Class[]>(`/api/classes?${params.toString()}`);
}

export function getClass(classId: number): Promise<Class> {
  return apiRequest<Class>(`/api/classes/${classId}`);
}

export function createClass(input: CreateClassInput): Promise<Class> {
  return apiRequest<Class>("/api/classes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateClass(classId: number, input: UpdateClassInput): Promise<Class> {
  return apiRequest<Class>(`/api/classes/${classId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function archiveClass(classId: number): Promise<Class> {
  return apiRequest<Class>(`/api/classes/${classId}/archive`, { method: "POST" });
}

export function restoreClass(classId: number): Promise<Class> {
  return apiRequest<Class>(`/api/classes/${classId}/restore`, { method: "POST" });
}
