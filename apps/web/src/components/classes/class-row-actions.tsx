"use client";

import Link from "next/link";

import { archiveClass, restoreClass } from "@/lib/classes";
import type { Class } from "@/types/class";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const buttonClassName =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50";

const errorClassName = "mt-1 text-sm text-red-700";

export function ClassRowActions({ classItem }: { classItem: Class }) {
  const queryClient = useQueryClient();

  const { isError, isPending, error, mutate } = useMutation({
    mutationFn: async (shouldArchive: boolean) => {
      if (shouldArchive) {
        return archiveClass(classItem.id);
      } else {
        return restoreClass(classItem.id);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });

  return (
    <div className="flex items-center gap-2">
      <Link href={`/classes/${classItem.id}`} className={buttonClassName}>
        Manage
      </Link>

      <button
        type="button"
        className={buttonClassName}
        disabled={isPending}
        onClick={() => mutate(!classItem.archived_at)}
      >
        {classItem.archived_at ? "Restore" : "Archive"}
      </button>

      {isError && (
        <p className={errorClassName}>
          {error instanceof Error ? error.message : "An error occurred"}
        </p>
      )}
    </div>
  );
}
