"use client";

import { useQuery } from "@tanstack/react-query";

import { StudentRowActions } from "@/components/students/student-row-actions";
import { getStudents } from "@/lib/students";
import { StudentStatus } from "@/types/student";

const emptyStateCopy: Record<
  StudentStatus,
  { heading: string; body: string }
> = {
  active: {
    heading: "No active students",
    body: "Add a student using the form, or check the archived filter.",
  },
  archived: {
    heading: "No archived students",
    body: "Students you archive will appear here.",
  },
  all: {
    heading: "No students yet",
    body: "Add your first student using the form.",
  },
};

// TODO(you) Step 5: accept a `status: StudentStatus` prop, include it in the
// query key, and pass it to getStudents.
//
// Questions:
//   - With queryKey ["students", status], what happens when you switch
//     filters twice -- does TanStack Query refetch, or serve the first
//     result from cache? Which do you want here?
//   - queryFn currently passes getStudents by reference. TanStack calls it
//     with a context argument -- what breaks if you leave it that way once
//     getStudents takes a parameter?
export function StudentList({ status }: { status: StudentStatus }) {
  const {
    data: students,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["students", status],
    queryFn: () => getStudents(status),
  });

  if (isPending) {
    return (
      <p className="text-sm text-zinc-600">
        Loading students...
      </p>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="font-medium text-red-900">
          Unable to load students
        </p>

        <p className="mt-1 text-sm text-red-700">
          {error.message}
        </p>

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

  if (students.length === 0) {
    const { heading, body } = emptyStateCopy[status];

    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center">
        <h2 className="font-semibold text-zinc-900">
          {heading}
        </h2>

        <p className="mt-2 text-sm text-zinc-600">
          {body}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <table className="w-full border-collapse text-left">
        <thead className="bg-zinc-100">
          <tr>
            <th className="px-4 py-3 text-sm font-semibold">
              Name
            </th>
            <th className="px-4 py-3 text-sm font-semibold">
              Email
            </th>
            <th className="px-4 py-3 text-sm font-semibold">
              Phone
            </th>
            <th className="px-4 py-3 text-sm font-semibold">
              Date of birth
            </th>
            <th className="px-4 py-3 text-sm font-semibold">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-200">
          {students.map((student) => (
            <tr key={student.id}>
              <td className="px-4 py-3">
                {student.first_name} {student.last_name}

                {student.archived_at && (
                  <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
                    Archived
                  </span>
                )}
              </td>

              <td className="px-4 py-3 text-sm text-zinc-600">
                {student.email ?? "—"}
              </td>

              <td className="px-4 py-3 text-sm text-zinc-600">
                {student.phone ?? "—"}
              </td>

              <td className="px-4 py-3 text-sm text-zinc-600">
                {student.date_of_birth ?? "—"}
              </td>

              <td className="px-4 py-3">
                <StudentRowActions student={student} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
