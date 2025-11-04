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
  // Default variant adds contrast/saturation in light mode for better visibility
  const filterClasses = variant === "sidebar" 
    ? "brightness-0 invert dark:brightness-100 dark:invert-0" 
    : "contrast-125 saturate-150 dark:brightness-0 dark:invert";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={logoImage}
        alt="Combine Trade Copier Logo"
        className={`${sizeClasses[size]} w-auto ${filterClasses}`}
        data-testid="logo-image"
      />
      {!showText && <span className="sr-only">Combine Trade Copier</span>}
    </div>
  );
}
