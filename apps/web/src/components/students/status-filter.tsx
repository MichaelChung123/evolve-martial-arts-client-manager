import type { StudentStatus } from "@/types/student";
import Link from "next/link";

const options: { value: StudentStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

const containerClassName =
  "mb-4 flex gap-1 rounded-lg border border-zinc-200 p-1";

const optionClassName = "rounded-md px-3 py-1.5 text-sm font-medium";

const currentOptionClassName = "bg-zinc-950 text-white";

const otherOptionClassName = "text-zinc-600 hover:bg-zinc-100";

export function StatusFilter({
  current,
}: {
  current: StudentStatus;
}) {
  return (
    <div className={containerClassName}>
      {options.map((option) => {
        const isCurrent = option.value === current;
        const className = [
          optionClassName,
          isCurrent ? currentOptionClassName : otherOptionClassName,
        ].join(" ");

        return (
          <Link
            key={option.value}
            href={`?status=${option.value}`}
            className={className}
            aria-current={isCurrent ? "page" : undefined}
          >
            {option.label}
          </Link>
        );

      })}
    </div>
  )
}
