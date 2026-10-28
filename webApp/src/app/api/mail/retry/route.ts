import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { retryPendingAnnouncementMail } from "@/lib/server/mail/notify";

// Largo: una pasada puede mandar cientos de mails.
export const maxDuration = 300;

function validSecret(header: string | null, secret: string): boolean {
  const given = Buffer.from(header?.startsWith("Bearer ") ? header.slice(7) : "");
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// D-51 · lo invoca un cron (Vercel Cron manda `Authorization: Bearer $CRON_SECRET`; en local,
// curl con el mismo header). Sin CRON_SECRET configurado el endpoint no existe de hecho.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (!validSecret(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await retryPendingAnnouncementMail());
}
