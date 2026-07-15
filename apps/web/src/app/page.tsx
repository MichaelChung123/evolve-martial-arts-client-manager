import { StudentForm } from "@/components/students/student-form";
import { StudentList } from "@/components/students/student-list";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Evolve Martial Arts
        </p>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-950">
          Students
        </h1>

        <p className="mt-3 max-w-2xl text-zinc-600">
          View and manage the students enrolled at the school.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section>
          <StudentList />
        </section>

        <aside>
          <StudentForm />
        </aside>
      </div>
    </main>
  );
}