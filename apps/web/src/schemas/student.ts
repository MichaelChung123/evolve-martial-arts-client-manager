import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null);

export const createStudentSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(100, "First name must be 100 characters or fewer"),

  last_name: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(100, "Last name must be 100 characters or fewer"),

  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .or(z.literal(""))
    .transform((value) => value || null),

  phone: optionalText,

  date_of_birth: z
    .string()
    .refine(
      (value) =>
        value === "" ||
        !Number.isNaN(Date.parse(value)),
      "Enter a valid date",
    )
    .transform((value) => value || null),
});

export type CreateStudentFormValues = z.input<
  typeof createStudentSchema
>;

export type CreateStudentValues = z.output<
  typeof createStudentSchema
>;
