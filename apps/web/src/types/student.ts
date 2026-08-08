export type StudentStatus = "active" | "archived" | "all";

export type Student = {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateStudentInput = {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
};