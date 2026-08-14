"use client";

const containerClassName = "mx-auto max-w-6xl px-6 py-12";

const headingClassName = "text-2xl font-bold tracking-tight text-zinc-950";

const messageClassName = "mt-3 max-w-2xl text-zinc-600";

const retryClassName =
  "mt-6 rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={containerClassName}>
      <h2 className={headingClassName}>Something went wrong</h2>
      <p className={messageClassName}>
        An unexpected error occurred. Please try again.
        {error.digest && <> Reference: {error.digest}</>}
      </p>
      <button className={retryClassName} onClick={reset}>
        Retry
      </button>
    </div>
  );
}

