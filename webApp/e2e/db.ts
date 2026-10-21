import { execFileSync } from "node:child_process";

// Mismo contenedor que usa el harness B-1 (`DBC`). Playwright no habla con Postgres y el flujo
// necesita dejar la base como la encontró: la solicitud de la alumna se borra antes y después.
const DBC = process.env.DBC ?? "supabase_db_webApp";

export function psql(query: string): string {
  return execFileSync("docker", ["exec", DBC, "psql", "-U", "postgres", "-d", "postgres", "-tAc", query], {
    encoding: "utf8",
  }).trim();
}
