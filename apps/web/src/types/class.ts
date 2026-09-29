export type ClassStatus = "active" | "archived" | "all";

export type Schedule = {
  weekdays: number[];
  start_time: string;
  end_time: string;
};

export type Class = {
  id: number;
  program_id: number;
  name: string;
  description: string | null;
  schedule: Schedule;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateClassInput = {
  program_id: number;
  name: string;
  description: string | null;
  schedule: Schedule;
};

export type UpdateClassInput = Partial<CreateClassInput>;
