import { ProgramForm } from "@/components/programs/program-form";
import { ProgramList } from "@/components/programs/program-list";
import { StatusFilter } from "@/components/programs/status-filter";
import { ProgramStatus } from "@/types/program";

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const normalizeStatus = (status?: string): ProgramStatus => {
    if (!["active", "archived", "all"].includes(status ?? "")) {
      return "active";
    }
    return status as ProgramStatus;
  };
  const params = await searchParams;
  const status = normalizeStatus(params.status);
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-950">Programs</h1>

        <p className="mt-3 max-w-2xl text-zinc-600">
          View and manage the training programs offered at the school.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section>
          <StatusFilter current={status} />
          <ProgramList status={status} />
        </section>

        <aside>
          <ProgramForm />
        </aside>
      </div>
    </main>
  );
}
