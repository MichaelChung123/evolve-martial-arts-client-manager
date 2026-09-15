export type ProgramStatus = "active" | "archived" | "all";

export type Program = {
  id: number;
  name: string;
  description: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateProgramInput = {
  name: string;
  description: string | null;
};
