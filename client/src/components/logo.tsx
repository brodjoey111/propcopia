import logoImage from "@assets/7a1b9db2-0483-4225-aba5-b1346398967b_1762287022476.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  variant?: "default" | "sidebar";
}

export function Logo({ className = "", size = "md", showText = true, variant = "default" }: LogoProps) {
  const sizeClasses = {
    sm: "h-8",
    md: "h-10",
    lg: "h-12",
  };

  // Sidebar variant needs to be inverted in light mode (since sidebar is dark)
  // and normal in dark mode
  // Default variant adds contrast/saturation in light mode, inverts in dark mode
  const filterClasses = variant === "sidebar"
    ? "brightness-0 invert opacity-95"
    : "brightness-0 invert opacity-95";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={logoImage}
        alt="Propcopia Logo"
        className={`${sizeClasses[size]} w-auto ${filterClasses}`}
        data-testid="logo-image"
      />
      {showText && (
        <span className="text-lg font-semibold tracking-[-0.04em] text-white">
          PropCopia
        </span>
      )}
      {!showText && <span className="sr-only">PropCopia</span>}
    </div>
  );
}
