import { z } from "zod";

// TODO(you): define createProgramSchema, following
// apps/web/src/schemas/student.ts's pattern:
//   - name: required, trimmed, 1-100 characters
//   - description: optional text (trim empty string to null, like
//     `optionalText` does in schemas/student.ts)
// Then export CreateProgramFormValues (z.input<...>) and
// CreateProgramValues (z.output<...>), matching student.ts's naming.

export const createProgramSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
  description: z
    .string()
    .trim()
    .transform((value) => value || null),
});

export type CreateProgramFormValues = z.input<typeof createProgramSchema>;

export type CreateProgramValues = z.output<typeof createProgramSchema>;
