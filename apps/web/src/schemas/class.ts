import { z } from "zod";

// TODO(you): define createClassSchema, following schemas/student.ts's
// pattern, with fields:
//   - program_id: coerced to number, required (the <select> will submit a
//     string value)
//   - name: required, trimmed, 1-100 characters
//   - description: optional text (trim empty string to null)
//   - weekdays: an array of selected weekday numbers from checkboxes —
//     must be non-empty
//   - start_time / end_time: HTML <input type="time"> values ("HH:MM"
//     strings) — validate end_time is after start_time (z.object(...).refine)
//
// The form will submit weekdays/start_time/end_time as flat fields; use a
// .transform() at the end to nest them into { schedule: { weekdays,
// start_time, end_time } } matching CreateClassInput's shape, so the form
// component doesn't have to build that nesting by hand.

export const createClassSchema = z
  .object({
    // z.coerce.number() runs the raw input through Number(...) before
    // validating, so the string a <select>/checkbox actually submits
    // ("1") becomes a real number (1). Plain z.int() only validates,
    // never converts — it would reject "1" outright.
    program_id: z.coerce.number().int(),

    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(100, "Name must be 100 characters or fewer"),

    description: z
      .string()
      .trim()
      .transform((value) => value || null),

    // .int() constrains EACH element (0-6, whole numbers); .min(1, ...)
    // after .array() constrains the ARRAY's length, not a number's value —
    // that's what makes an empty checkbox selection fail, without
    // wrongly rejecting weekday 0 (Monday).
    weekdays: z.coerce.number().int().array().min(1, "Select at least one day"),

    // Plain strings here — the cross-field comparison against each other
    // happens once, below, on the whole object, not on either field alone.
    start_time: z.string(),
    end_time: z.string(),
  })
  .refine((data) => data.end_time > data.start_time, {
    message: "End time must be after start time",
    path: ["end_time"], // attaches the error to errors.end_time, not errors.root
  })
  .transform((data) => ({
    program_id: data.program_id,
    name: data.name,
    description: data.description,
    schedule: {
      weekdays: data.weekdays,
      start_time: data.start_time,
      end_time: data.end_time,
    },
  }));

export type CreateClassFormValues = z.input<typeof createClassSchema>;

export type CreateClassValues = z.output<typeof createClassSchema>;
