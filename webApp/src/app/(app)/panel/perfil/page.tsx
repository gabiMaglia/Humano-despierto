import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Nav from "@/components/layout/Nav";
import AvatarForm from "@/components/profile/AvatarForm";
import ProfileForm from "@/components/profile/ProfileForm";
import { getOwnProfile } from "@/lib/server/profile";
import type { AppRole } from "@/lib/stores/useAuthStore";

export const metadata: Metadata = {
  title: "Mi perfil",
  robots: { index: false, follow: false },
};

const ROLE_LABEL: Record<AppRole, string> = { student: "Alumna", teacher: "Guía", admin: "Administración" };

export default async function PerfilPage() {
  const profile = await getOwnProfile();
  if (!profile) redirect("/entrar?next=/panel/perfil");

  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <Nav />
      <div className="pt-16">
        <header className="border-b border-linea bg-papel px-6 py-8 md:px-12">
          <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-suave">— Tu ficha —</p>
          <h1 className="font-display text-display-md text-tinta">
            Mi <em className="font-quote italic text-miel-800">perfil</em>
          </h1>
          <p className="mt-2 font-display text-eyebrow tracking-wide text-suave">{ROLE_LABEL[profile.role]}</p>
        </header>
        <main className="mx-auto grid max-w-4xl gap-8 px-6 py-12 md:grid-cols-[auto_1fr] md:px-12">
          <AvatarForm avatarUrl={profile.avatarUrl} glyph={profile.glyph ?? "☉"} fullName={profile.fullName} />
          <ProfileForm
            profile={{ fullName: profile.fullName, bio: profile.bio, phone: profile.phone, birthDate: profile.birthDate }}
            today={new Date().toISOString().slice(0, 10)}
          />
        </main>
      </div>
    </div>
  );
}
