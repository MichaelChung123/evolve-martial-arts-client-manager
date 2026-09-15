"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { createProgram } from "@/lib/programs";
import {
  createProgramSchema,
  type CreateProgramFormValues,
  type CreateProgramValues,
} from "@/schemas/program";

export function ProgramForm() {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateProgramFormValues, unknown, CreateProgramValues>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createProgram,
    onSuccess: async () => {
      reset();

      await queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
  });

  async function onSubmit(values: CreateProgramValues) {
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      setError("root", {
        type: "server",
        message: error instanceof Error ? error.message : "Unable to create program",
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
        <h2 className="text-xl font-semibold text-zinc-950">Add program</h2>

        <p className="mt-1 text-sm text-zinc-600">
          Name a training program students can be grouped under.
        </p>
      </div>

      <div className="grid gap-5">
        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Name</span>

          <input {...register("name")} className={fieldClassName} />

          {errors.name && <p className={errorClassName}>{errors.name.message}</p>}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Description</span>

          <textarea {...register("description")} rows={3} className={fieldClassName} />

          {errors.description && (
            <p className={errorClassName}>{errors.description.message}</p>
          )}
        </label>
      </div>

      {errors.root && (
        <div className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errors.root.message}
        </div>
      )}

      {mutation.isSuccess && (
        <div className="mt-5 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Program created successfully.
        </div>
      )}

      <div className="mt-6">
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? "Creating..." : "Create program"}
        </button>
      </div>
    </form>
  );
}
