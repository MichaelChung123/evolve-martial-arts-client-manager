"use client";

import { useQuery } from "@tanstack/react-query";

import { ClassRowActions } from "@/components/classes/class-row-actions";
import { formatSchedule } from "@/components/classes/format-schedule";
import { getClasses } from "@/lib/classes";
import { getPrograms } from "@/lib/programs";
import { ClassStatus } from "@/types/class";

const emptyStateCopy: Record<ClassStatus, { heading: string; body: string }> = {
  active: {
    heading: "No active classes",
    body: "Add a class using the form, or check the archived filter.",
  },
  archived: {
    heading: "No archived classes",
    body: "Classes you archive will appear here.",
  },
  all: {
    heading: "No classes yet",
    body: "Add your first class using the form.",
  },
};

export function ClassList({ status }: { status: ClassStatus }) {
  const {
    data: classes,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["classes", status],
    queryFn: () => getClasses(status),
  });

  // Archived classes can point at archived programs, so the lookup needs
  // "all" rather than "active" or a class on an archived program would show
  // a blank Program column.
  const { data: programs } = useQuery({
    queryKey: ["programs", "all"],
    queryFn: () => getPrograms("all"),
  });

  const programNameById = new Map(programs?.map((program) => [program.id, program.name]));

  if (isPending) {
    return <p className="text-sm text-zinc-600">Loading classes...</p>;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="font-medium text-red-900">Unable to load classes</p>

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

  if (classes.length === 0) {
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
            <th className="px-4 py-3 text-sm font-semibold">Program</th>
            <th className="px-4 py-3 text-sm font-semibold">Schedule</th>
            <th className="px-4 py-3 text-sm font-semibold">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-200">
          {classes.map((classItem) => (
            <tr key={classItem.id}>
              <td className="px-4 py-3">
                {classItem.name}

                {classItem.archived_at && (
                  <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
                    Archived
                  </span>
                )}
              </td>

              <td className="px-4 py-3 text-sm text-zinc-600">
                {programNameById.get(classItem.program_id) ?? "—"}
              </td>

              <td className="px-4 py-3 text-sm text-zinc-600">
                {formatSchedule(classItem.schedule)}
              </td>

              <td className="px-4 py-3">
                <ClassRowActions classItem={classItem} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
