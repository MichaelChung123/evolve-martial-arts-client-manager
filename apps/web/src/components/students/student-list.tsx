"use client";

import { useQuery } from "@tanstack/react-query";

import { getStudents } from "@/lib/students";

export function StudentList() {
  const {
    data: students,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["students"],
    queryFn: getStudents,
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
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center">
        <h2 className="font-semibold text-zinc-900">
          No students yet
        </h2>

        <p className="mt-2 text-sm text-zinc-600">
          Add your first student through the API documentation
          for now.
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
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-200">
          {students.map((student) => (
            <tr key={student.id}>
              <td className="px-4 py-3">
                {student.first_name} {student.last_name}
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
