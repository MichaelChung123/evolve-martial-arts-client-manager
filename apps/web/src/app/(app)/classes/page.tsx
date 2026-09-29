import { ClassForm } from "@/components/classes/class-form";
import { ClassList } from "@/components/classes/class-list";
import { StatusFilter } from "@/components/classes/status-filter";
import { ClassStatus } from "@/types/class";

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const normalizeStatus = (status?: string): ClassStatus => {
    if (!["active", "archived", "all"].includes(status ?? "")) {
      return "active";
    }
    return status as ClassStatus;
  };
  const params = await searchParams;
  const status = normalizeStatus(params.status);
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-950">Classes</h1>

        <p className="mt-3 max-w-2xl text-zinc-600">
          View and manage the classes offered at the school.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section>
          <StatusFilter current={status} />
          <ClassList status={status} />
        </section>

        <aside>
          <ClassForm />
        </aside>
      </div>
    </main>
  );
}
