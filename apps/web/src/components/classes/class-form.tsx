"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { createClass } from "@/lib/classes";
import { getPrograms } from "@/lib/programs";
import {
  createClassSchema,
  type CreateClassFormValues,
  type CreateClassValues,
} from "@/schemas/class";

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];

export function ClassForm() {
  const queryClient = useQueryClient();

  const { data: programs } = useQuery({
    queryKey: ["programs", "active"],
    queryFn: () => getPrograms("active"),
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateClassFormValues, unknown, CreateClassValues>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      program_id: "",
      name: "",
      description: "",
      weekdays: [],
      start_time: "",
      end_time: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createClass,
    onSuccess: async () => {
      reset();

      await queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });

  async function onSubmit(values: CreateClassValues) {
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      setError("root", {
        type: "server",
        message: error instanceof Error ? error.message : "Unable to create class",
      });
    }
  }

  const fieldClassName =
    "mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";

  const errorClassName = "mt-1 text-sm text-red-700";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-lg border border-zinc-200 bg-white p-6"
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-950">Add class</h2>

        <p className="mt-1 text-sm text-zinc-600">
          Name a class, assign it to a program, and set its weekly schedule.
        </p>
      </div>

      <div className="grid gap-5">
        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Name</span>

          <input {...register("name")} className={fieldClassName} />

          {errors.name && <p className={errorClassName}>{errors.name.message}</p>}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Program</span>

          <select {...register("program_id")} className={fieldClassName}>
            <option value="">Select a program</option>
            {programs?.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>

          {errors.program_id && (
            <p className={errorClassName}>{errors.program_id.message}</p>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Description</span>

          <textarea {...register("description")} rows={3} className={fieldClassName} />

          {errors.description && (
            <p className={errorClassName}>{errors.description.message}</p>
          )}
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-zinc-800">Days</legend>

          <div className="mt-1 flex flex-wrap gap-3">
            {WEEKDAY_OPTIONS.map((day) => (
              <label
                key={day.value}
                className="flex items-center gap-1.5 text-sm text-zinc-700"
              >
                <input type="checkbox" value={day.value} {...register("weekdays")} />
                {day.label}
              </label>
            ))}
          </div>

          {errors.weekdays && <p className={errorClassName}>{errors.weekdays.message}</p>}
        </fieldset>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-zinc-800">Start time</span>

            <input type="time" {...register("start_time")} className={fieldClassName} />

            {errors.start_time && (
              <p className={errorClassName}>{errors.start_time.message}</p>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-800">End time</span>

            <input type="time" {...register("end_time")} className={fieldClassName} />

            {errors.end_time && <p className={errorClassName}>{errors.end_time.message}</p>}
          </label>
        </div>
      </div>

      {errors.root && (
        <div className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errors.root.message}
        </div>
      )}

      {mutation.isSuccess && (
        <div className="mt-5 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Class created successfully.
        </div>
      )}

      <div className="mt-6">
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? "Creating..." : "Create class"}
        </button>
      </div>
    </form>
  );
}
