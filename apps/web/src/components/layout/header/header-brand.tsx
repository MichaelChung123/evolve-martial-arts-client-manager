import Link from "next/link";

const brandClassName =
  "rounded-md text-base font-semibold tracking-tight text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2";

export function HeaderBrand() {
  return (
    <Link href="/" className={brandClassName}>
      {/* once img tag is provided from Rykel, add alt attribute to it named "Evolve Martial Arts" */}
      Evolve Martial Arts
    </Link>
  );
}
