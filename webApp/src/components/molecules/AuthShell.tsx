import type { ReactNode } from "react";
import AuthBrand from "./AuthBrand";

interface Props {
  title: string;
  accent: string;
  lead: string;
  children: ReactNode;
}

export default function AuthShell({ title, accent, lead, children }: Props) {
  return (
    <div className="flex justify-center px-4 py-12">
      <div className="w-full max-w-[520px] bg-papel px-8 py-6 md:px-14">
        <AuthBrand />
        <div className="mb-5">
          <h1 className="mb-1.5 font-display text-2xl tracking-wide text-tinta">
            {title} <em className="font-quote italic text-miel-800 normal-case">{accent}</em>
          </h1>
          <p className="font-body text-sm text-suave">{lead}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
