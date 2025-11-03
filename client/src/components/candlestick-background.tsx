export function CandlestickBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <svg
        className="h-full w-full opacity-[0.03] dark:opacity-[0.08]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="candlestick-pattern"
            x="0"
            y="0"
            width="120"
            height="200"
            patternUnits="userSpaceOnUse"
          >
            {/* Green bullish candlestick */}
            <line x1="20" y1="40" x2="20" y2="80" stroke="hsl(var(--chart-2))" strokeWidth="1" />
            <rect x="15" y="55" width="10" height="20" fill="none" stroke="hsl(var(--chart-2))" strokeWidth="1.5" />
            
            {/* Red bearish candlestick */}
            <line x1="50" y1="30" x2="50" y2="90" stroke="hsl(var(--destructive))" strokeWidth="1" />
            <rect x="45" y="35" width="10" height="25" fill="hsl(var(--destructive))" opacity="0.3" stroke="hsl(var(--destructive))" strokeWidth="1.5" />
            
            {/* Green bullish candlestick */}
            <line x1="80" y1="50" x2="80" y2="100" stroke="hsl(var(--chart-2))" strokeWidth="1" />
            <rect x="75" y="65" width="10" height="30" fill="none" stroke="hsl(var(--chart-2))" strokeWidth="1.5" />
            
            {/* Red bearish candlestick */}
            <line x1="110" y1="20" x2="110" y2="70" stroke="hsl(var(--destructive))" strokeWidth="1" />
            <rect x="105" y="25" width="10" height="20" fill="hsl(var(--destructive))" opacity="0.3" stroke="hsl(var(--destructive))" strokeWidth="1.5" />

            {/* Second row */}
            <line x1="20" y1="140" x2="20" y2="180" stroke="hsl(var(--destructive))" strokeWidth="1" />
            <rect x="15" y="145" width="10" height="30" fill="hsl(var(--destructive))" opacity="0.3" stroke="hsl(var(--destructive))" strokeWidth="1.5" />
            
            <line x1="50" y1="130" x2="50" y2="190" stroke="hsl(var(--chart-2))" strokeWidth="1" />
            <rect x="45" y="150" width="10" height="35" fill="none" stroke="hsl(var(--chart-2))" strokeWidth="1.5" />
            
            <line x1="80" y1="125" x2="80" y2="175" stroke="hsl(var(--chart-2))" strokeWidth="1" />
            <rect x="75" y="135" width="10" height="35" fill="none" stroke="hsl(var(--chart-2))" strokeWidth="1.5" />
            
            <line x1="110" y1="120" x2="110" y2="180" stroke="hsl(var(--destructive))" strokeWidth="1" />
            <rect x="105" y="130" width="10" height="40" fill="hsl(var(--destructive))" opacity="0.3" stroke="hsl(var(--destructive))" strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#candlestick-pattern)" />
      </svg>
    </div>
  );
}
