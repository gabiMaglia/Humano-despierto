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
    <div className="min-h-screen bg-cosmos-0 text-ink">
      <Nav />
      <div className="pt-16">
        <header className="border-b border-lila-300/18 bg-cosmos-surface px-6 py-8 md:px-12">
          <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-ink-faint">— Tu ficha —</p>
          <h1 className="font-display text-display-md text-ink">
            Mi <em className="font-quote italic text-lila-300">perfil</em>
          </h1>
          <p className="mt-2 font-display text-eyebrow tracking-cosmic text-ink-soft">{ROLE_LABEL[profile.role]}</p>
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
