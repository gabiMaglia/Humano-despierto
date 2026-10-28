import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { AuthAsideKey } from "@/content/auth-aside";
import AuthFrame from "./AuthFrame";

interface Props {
  title: string;
  accent: string;
  lead: string;
  aside?: AuthAsideKey;
  children: ReactNode;
}

export function AuthHeading({ title, accent, lead, className }: Omit<Props, "children" | "aside"> & { className?: string }) {
  return (
    <div className={cn("mb-6", className)}>
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-bosque">
        {title} <span className="text-miel-800">{accent}</span>
      </h1>
      <p className="text-base text-suave">{lead}</p>
    </div>
  );
}

export default function AuthShell({ title, accent, lead, aside = "entrar", children }: Props) {
  return (
    <AuthFrame aside={aside}>
      <AuthHeading title={title} accent={accent} lead={lead} />
      {children}
    </AuthFrame>
  );
}
