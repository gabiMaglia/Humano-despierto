import EntrarForm from "./EntrarForm";
import { internalNext } from "@/lib/auth/safe-next";

// Server Component para leer `next` y `error` sin `useSearchParams`: con ese hook Next exige un
// <Suspense> y el HTML inicial de /entrar saldría vacío. La metadata sigue en layout.tsx.
export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  return (
    <EntrarForm
      next={internalNext(typeof params.next === "string" ? params.next : null)}
      linkError={params.error === "link"}
    />
  );
}
