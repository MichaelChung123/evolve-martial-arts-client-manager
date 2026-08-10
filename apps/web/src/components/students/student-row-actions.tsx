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
  // TODO(you) Step 3: show Archive for an active student and Restore for an
  // archived one, wired to useMutation. The classNames above are ready to use.
  //
  // Questions:
  //   - Which query key do you invalidate so every status view refreshes --
  //     and why does ["students"] cover ["students", "archived"]?
  //   - Archiving is reversible here. Does that change whether it needs a
  //     confirmation? security-privacy.md asks for confirmation on
  //     destructive or hard-to-reverse actions -- which is this?
  //   - While a mutation is in flight, what does the button say, and can it
  //     be clicked a second time? The backend tolerates a double archive by
  //     preserving the original timestamp, but the UI should not rely on
  //     that to behave correctly.
  //   - If the request fails, where does the error surface? react-nextjs.md
  //     requires explicit loading, error, and disabled states.
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
