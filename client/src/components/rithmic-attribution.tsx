import { useState } from "react";

interface AttributionLogoProps {
  src: string;
  alt: string;
  fallback: string;
  className?: string;
}

function AttributionLogo({ src, alt, fallback, className = "" }: AttributionLogoProps) {
  const [imageAvailable, setImageAvailable] = useState(true);

  if (imageAvailable) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => setImageAvailable(false)}
      />
    );
  }

  return (
    <div
      className={`inline-flex min-h-10 items-center justify-center rounded-md border border-dashed border-border px-3 py-2 text-center text-xs font-medium text-muted-foreground ${className}`}
    >
      {fallback}
    </div>
  );
}

interface RithmicAttributionProps {
  compact?: boolean;
  className?: string;
}

export function RithmicAttribution({
  compact = false,
  className = "",
}: RithmicAttributionProps) {
  return (
    <div
      className={`rounded-xl border border-border/70 bg-muted/30 ${compact ? "p-3" : "p-4"} ${className}`}
      data-testid="rithmic-attribution"
    >
      <div className={`flex ${compact ? "flex-col gap-3" : "flex-col gap-4"} md:flex-row md:items-center md:justify-between`}>
        <div className="space-y-1">
          <p className="text-sm font-medium">Rithmic Attribution</p>
          <p className="text-xs text-muted-foreground">
            Official Rithmic and OMNE branding for compliance review.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <AttributionLogo
            src="/brand-assets/trading-platform-by-rithmic.png"
            alt="Trading Platform by Rithmic"
            fallback="Trading Platform by Rithmic"
            className="max-h-10 w-auto rounded-md bg-background px-2 py-1"
          />
          <AttributionLogo
            src="/brand-assets/powered-by-omne.png"
            alt="Powered by OMNE"
            fallback="Powered by OMNE"
            className="max-h-10 w-auto rounded-md bg-background px-2 py-1"
          />
        </div>
      </div>

      <div className={`mt-3 space-y-1 text-xs text-muted-foreground ${compact ? "" : "sm:max-w-3xl"}`}>
        <p>Rithmic and R | Trader are trademarks of Rithmic, LLC.</p>
        <p>Powered by OMNE.</p>
        <p>These logos and notices are displayed in the product for conformance review.</p>
      </div>
    </div>
  );
}
