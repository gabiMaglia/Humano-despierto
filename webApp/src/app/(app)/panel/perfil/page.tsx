import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/layout/SiteHeader";
import AppPageHeader from "@/components/layout/AppPageHeader";
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
      <SiteHeader />
      <AppPageHeader eyebrow={`Tu cuenta · ${ROLE_LABEL[profile.role]}`} title="Mi perfil" subtitle="Tu nombre, tu imagen y cómo te presentás en la escuela." />
      <main className="mx-auto grid max-w-[1200px] items-start gap-8 px-6 py-12 md:grid-cols-[288px_minmax(0,1fr)]">
        <AvatarForm avatarUrl={profile.avatarUrl} fullName={profile.fullName} />
        <ProfileForm
          profile={{ fullName: profile.fullName, bio: profile.bio, phone: profile.phone, birthDate: profile.birthDate }}
          today={new Date().toISOString().slice(0, 10)}
        />
      </main>
    </div>
  );
}
