"use client";

import { useQuery } from "@tanstack/react-query";

import { ProgramRowActions } from "@/components/programs/program-row-actions";
import { getPrograms } from "@/lib/programs";
import { ProgramStatus } from "@/types/program";

const emptyStateCopy: Record<ProgramStatus, { heading: string; body: string }> = {
  active: {
    heading: "No active programs",
    body: "Add a program using the form, or check the archived filter.",
  },
  archived: {
    heading: "No archived programs",
    body: "Programs you archive will appear here.",
  },
  all: {
    heading: "No programs yet",
    body: "Add your first program using the form.",
  },
};

export function ProgramList({ status }: { status: ProgramStatus }) {
  const {
    data: programs,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["programs", status],
    queryFn: () => getPrograms(status),
  });

  if (isPending) {
    return <p className="text-sm text-zinc-600">Loading programs...</p>;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="font-medium text-red-900">Unable to load programs</p>

        <p className="mt-1 text-sm text-red-700">{error.message}</p>

        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (programs.length === 0) {
    const { heading, body } = emptyStateCopy[status];

    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center">
        <h2 className="font-semibold text-zinc-900">{heading}</h2>

        <p className="mt-2 text-sm text-zinc-600">{body}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <table className="w-full border-collapse text-left">
        <thead className="bg-zinc-100">
          <tr>
            <th className="px-4 py-3 text-sm font-semibold">Name</th>
            <th className="px-4 py-3 text-sm font-semibold">Description</th>
            <th className="px-4 py-3 text-sm font-semibold">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-200">
          {programs.map((program) => (
            <tr key={program.id}>
              <td className="px-4 py-3">
                {program.name}

                {program.archived_at && (
                  <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
                    Archived
                  </span>
                )}
              </td>

              <td className="px-4 py-3 text-sm text-zinc-600">
                {program.description ?? "—"}
              </td>

              <td className="px-4 py-3">
                <ProgramRowActions program={program} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
