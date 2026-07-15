"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { ApiError } from "@/lib/api";
import { createStudent } from "@/lib/students";
import {
  createStudentSchema,
  type CreateStudentFormValues,
  type CreateStudentValues,
} from "@/schemas/student";

export function StudentForm() {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<
    CreateStudentFormValues,
    unknown,
    CreateStudentValues
  >({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      date_of_birth: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createStudent,
    onSuccess: async () => {
      reset();

      await queryClient.invalidateQueries({
        queryKey: ["students"],
      });
    },
  });

  async function onSubmit(
    values: CreateStudentValues,
  ) {
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 409
      ) {
        setError("email", {
          type: "server",
          message: error.message,
        });

        return;
      }

      setError("root", {
        type: "server",
        message:
          error instanceof Error
            ? error.message
            : "Unable to create student",
      });
    }
  }

  const fieldClassName =
    "mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";

  const errorClassName =
    "mt-1 text-sm text-red-700";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-lg border border-zinc-200 bg-white p-6"
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-950">
          Add student
        </h2>

        <p className="mt-1 text-sm text-zinc-600">
          Enter the student&apos;s basic contact information.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-zinc-800">
            First name
          </span>

          <input
            {...register("first_name")}
            className={fieldClassName}
          />

          {errors.first_name && (
            <p className={errorClassName}>
              {errors.first_name.message}
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">
            Last name
          </span>

          <input
            {...register("last_name")}
            className={fieldClassName}
          />

          {errors.last_name && (
            <p className={errorClassName}>
              {errors.last_name.message}
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">
            Email
          </span>

          <input
            type="email"
            {...register("email")}
            className={fieldClassName}
          />

          {errors.email && (
            <p className={errorClassName}>
              {errors.email.message}
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">
            Phone
          </span>

          <input
            type="tel"
            {...register("phone")}
            className={fieldClassName}
          />

          {errors.phone && (
            <p className={errorClassName}>
              {errors.phone.message}
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">
            Date of birth
          </span>

          <input
            type="date"
            {...register("date_of_birth")}
            className={fieldClassName}
          />

          {errors.date_of_birth && (
            <p className={errorClassName}>
              {errors.date_of_birth.message}
            </p>
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
          Student created successfully.
        </div>
      )}

      <div className="mt-6">
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending
            ? "Creating..."
            : "Create student"}
        </button>
      </div>
    </form>
  );
}
