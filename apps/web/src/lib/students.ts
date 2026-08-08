import { apiRequest } from "@/lib/api";
import type {
  CreateStudentInput,
  Student,
  StudentStatus,
} from "@/types/student";

export function getStudents(
  status: StudentStatus = "active",
): Promise<Student[]> {
  return apiRequest<Student[]>(
    `/api/students?status=${status}`,
  );
}

export function getStudent(studentId: number): Promise<Student> {
  return apiRequest<Student>(`/api/students/${studentId}`);
}

export function createStudent(
  student: CreateStudentInput,
): Promise<Student> {
  return apiRequest<Student>("/api/students", {
    method: "POST",
    body: JSON.stringify(student),
  });
}