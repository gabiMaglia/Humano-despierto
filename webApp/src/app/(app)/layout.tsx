import AuthGate from "@/components/layout/AuthGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
