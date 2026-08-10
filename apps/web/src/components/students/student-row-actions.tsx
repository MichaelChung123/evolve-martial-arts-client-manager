"use client";

import { archiveStudent, restoreStudent } from "@/lib/students";
import type { Student } from "@/types/student";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const buttonClassName =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50";

const errorClassName = "mt-1 text-sm text-red-700";

export function StudentRowActions({
  student,
}: {
  student: Student;
}) {
  const queryClient = useQueryClient();


  const { isError, isPending, error, mutate } = useMutation({
    mutationFn: async (shouldArchive: boolean) => {
      if (shouldArchive) {
        const response = await archiveStudent(student.id);
        return response
      } else {
        return restoreStudent(student.id);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
    }
  })

  return (
    <div className="flex gap-2">
      <button
        type="button"
        className={buttonClassName}
        disabled={isPending}
        onClick={() => mutate(!student.archived_at)}
      >
        {student.archived_at ? "Restore" : "Archive"}
      </button>

      {isError && (
        <p className={errorClassName}>
          {error instanceof Error
            ? error.message
            : "An error occurred"}
        </p>
      )}
    </div>
  );
}
