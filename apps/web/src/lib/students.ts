import { apiRequest } from "@/lib/api";
import type {
  CreateStudentInput,
  Student,
} from "@/types/student";

export function getStudents(): Promise<Student[]> {
  return apiRequest<Student[]>("/api/students");
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