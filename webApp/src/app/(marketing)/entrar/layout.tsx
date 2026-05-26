import Nav from "@/components/layout/Nav";

export default function EntrarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <div className="h-[calc(100dvh-73px)] pt-[73px]">{children}</div>
    </>
  );
}
