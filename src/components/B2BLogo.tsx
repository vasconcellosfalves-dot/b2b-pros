import lineaLogo from "@/assets/linea-logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

export function B2BLogo({ size = "md", showTagline = false }: LogoProps) {
  // Texto B2B PROS em sans-serif bold (logo antigo)
  const text =
    size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-xl";

  // Logo Linea AUMENTADO em pelo menos 100% vs versão anterior
  // antes: sm=h-3, md=h-4, lg=h-5  →  agora: sm=h-7, md=h-9, lg=h-12
  const lineaH =
    size === "sm" ? "h-7" : size === "lg" ? "h-12" : "h-9";

  return (
    <div className="flex flex-col leading-none">
      <span
        className={`${text} font-sans font-bold tracking-tight text-foreground`}
      >
        B2B PROS
      </span>
      {showTagline && (
        <div className="mt-2 pl-[1px]">
          <img
            src={lineaLogo}
            alt="Linea Consulting"
            className={`${lineaH} w-auto opacity-95`}
          />
        </div>
      )}
    </div>
  );
}
