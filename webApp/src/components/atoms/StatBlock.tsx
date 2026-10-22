import { cn } from "@/lib/utils/cn";

interface Props {
  num: string;
  label: string;
  align?: "left" | "center";
  size?: "sm" | "md" | "lg";
}

const NUM_SIZES = { sm: "text-xl", md: "text-2xl", lg: "text-3xl" };

export default function StatBlock({ num, label, align = "center", size = "md" }: Props) {
  return (
    <div className={cn(align === "center" && "text-center")}>
      <span className={cn("block font-display text-tinta", NUM_SIZES[size])}>
        {num}
      </span>
      <span className="mt-1 block font-display text-eyebrow uppercase tracking-wide text-suave">
        {label}
      </span>
    </div>
  );
}
