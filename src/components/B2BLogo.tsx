import lineaLogo from "@/assets/linea-logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

export function B2BLogo({ size = "md", showTagline = false }: LogoProps) {
  const text =
    size === "sm" ? "text-xl" : size === "lg" ? "text-4xl" : "text-2xl";
  const byText =
    size === "sm" ? "text-[9px]" : size === "lg" ? "text-[11px]" : "text-[10px]";
  const lineaH = size === "sm" ? "h-3" : size === "lg" ? "h-5" : "h-4";

  return (
    <div className="flex flex-col leading-none">
      <span
        className={`${text} font-serif font-light tracking-[0.18em] text-foreground`}
      >
        B2B&nbsp;PROS
      </span>
      {showTagline && (
        <div className="flex items-center gap-1.5 mt-1.5 pl-[2px]">
          <span
            className={`${byText} font-serif italic tracking-wider text-muted-foreground`}
          >
            by
          </span>
          <img
            src={lineaLogo}
            alt="Linea Consulting"
            className={`${lineaH} w-auto opacity-90`}
          />
        </div>
      )}
    </div>
  );
}
