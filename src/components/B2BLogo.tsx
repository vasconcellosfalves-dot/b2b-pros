import { Briefcase } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

export function B2BLogo({ size = "md", showTagline = false }: LogoProps) {
  const dims = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-10 w-10";
  const text = size === "sm" ? "text-base" : size === "lg" ? "text-3xl" : "text-xl";
  return (
    <div className="flex items-center gap-3">
      <div
        className={`${dims} flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-[var(--shadow-elegant)]`}
      >
        <Briefcase className="h-1/2 w-1/2 text-primary-foreground" strokeWidth={2.5} />
      </div>
      <div className="flex flex-col leading-tight">
        <span className={`${text} font-bold tracking-tight text-foreground`}>
          B2B <span className="text-primary">PROS</span>
        </span>
        {showTagline && (
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            um produto Linea Consulting
          </span>
        )}
      </div>
    </div>
  );
}
