import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <div className="pt-[59px]">{children}</div>
      <Footer />
    </>
  );
}
