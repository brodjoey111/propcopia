export function CandlestickBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <svg
        className="h-full w-full opacity-[0.04] dark:opacity-[0.12]"
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
            {/* Animated Green bullish candlestick */}
            <g className="animate-candle-1">
              <line x1="20" y1="40" x2="20" y2="80" stroke="hsl(var(--chart-2))" strokeWidth="1" />
              <rect x="15" y="55" width="10" height="20" fill="none" stroke="hsl(var(--chart-2))" strokeWidth="1.5" />
            </g>
            
            {/* Animated Red bearish candlestick */}
            <g className="animate-candle-2">
              <line x1="50" y1="30" x2="50" y2="90" stroke="hsl(var(--destructive))" strokeWidth="1" />
              <rect x="45" y="35" width="10" height="25" fill="hsl(var(--destructive))" opacity="0.3" stroke="hsl(var(--destructive))" strokeWidth="1.5" />
            </g>
            
            {/* Animated Green bullish candlestick */}
            <g className="animate-candle-3">
              <line x1="80" y1="50" x2="80" y2="100" stroke="hsl(var(--chart-2))" strokeWidth="1" />
              <rect x="75" y="65" width="10" height="30" fill="none" stroke="hsl(var(--chart-2))" strokeWidth="1.5" />
            </g>
            
            {/* Animated Red bearish candlestick */}
            <g className="animate-candle-4">
              <line x1="110" y1="20" x2="110" y2="70" stroke="hsl(var(--destructive))" strokeWidth="1" />
              <rect x="105" y="25" width="10" height="20" fill="hsl(var(--destructive))" opacity="0.3" stroke="hsl(var(--destructive))" strokeWidth="1.5" />
            </g>

            {/* Second row */}
            <g className="animate-candle-5">
              <line x1="20" y1="140" x2="20" y2="180" stroke="hsl(var(--destructive))" strokeWidth="1" />
              <rect x="15" y="145" width="10" height="30" fill="hsl(var(--destructive))" opacity="0.3" stroke="hsl(var(--destructive))" strokeWidth="1.5" />
            </g>
            
            <g className="animate-candle-6">
              <line x1="50" y1="130" x2="50" y2="190" stroke="hsl(var(--chart-2))" strokeWidth="1" />
              <rect x="45" y="150" width="10" height="35" fill="none" stroke="hsl(var(--chart-2))" strokeWidth="1.5" />
            </g>
            
            <g className="animate-candle-7">
              <line x1="80" y1="125" x2="80" y2="175" stroke="hsl(var(--chart-2))" strokeWidth="1" />
              <rect x="75" y="135" width="10" height="35" fill="none" stroke="hsl(var(--chart-2))" strokeWidth="1.5" />
            </g>
            
            <g className="animate-candle-8">
              <line x1="110" y1="120" x2="110" y2="180" stroke="hsl(var(--destructive))" strokeWidth="1" />
              <rect x="105" y="130" width="10" height="40" fill="hsl(var(--destructive))" opacity="0.3" stroke="hsl(var(--destructive))" strokeWidth="1.5" />
            </g>
          </pattern>
          
          {/* Moving pattern container */}
          <g id="chart-movement">
            <rect width="100%" height="100%" fill="url(#candlestick-pattern)" />
          </g>
        </defs>
        
        <use href="#chart-movement" className="animate-chart-scroll" />
      </svg>
      
      <style>{`
        @keyframes candleFlicker1 {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-2px); }
          50% { transform: translateY(1px); }
          75% { transform: translateY(-1px); }
        }
        
        @keyframes candleFlicker2 {
          0%, 100% { transform: translateY(0); }
          33% { transform: translateY(2px); }
          66% { transform: translateY(-2px); }
        }
        
        @keyframes candleFlicker3 {
          0%, 100% { transform: translateY(0); }
          20% { transform: translateY(-1px); }
          40% { transform: translateY(2px); }
          60% { transform: translateY(-2px); }
          80% { transform: translateY(1px); }
        }
        
        @keyframes candleFlicker4 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        
        @keyframes candleFlicker5 {
          0%, 100% { transform: translateY(0); }
          30% { transform: translateY(1px); }
          70% { transform: translateY(-1px); }
        }
        
        @keyframes candleFlicker6 {
          0%, 100% { transform: translateY(0); }
          40% { transform: translateY(-2px); }
          80% { transform: translateY(1px); }
        }
        
        @keyframes candleFlicker7 {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(2px); }
          75% { transform: translateY(-1px); }
        }
        
        @keyframes candleFlicker8 {
          0%, 100% { transform: translateY(0); }
          35% { transform: translateY(-1px); }
          65% { transform: translateY(2px); }
        }
        
        @keyframes chartScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-120px); }
        }
        
        .animate-candle-1 {
          animation: candleFlicker1 3.5s ease-in-out infinite;
        }
        
        .animate-candle-2 {
          animation: candleFlicker2 4s ease-in-out infinite;
        }
        
        .animate-candle-3 {
          animation: candleFlicker3 4.5s ease-in-out infinite;
        }
        
        .animate-candle-4 {
          animation: candleFlicker4 3s ease-in-out infinite;
        }
        
        .animate-candle-5 {
          animation: candleFlicker5 3.8s ease-in-out infinite;
        }
        
        .animate-candle-6 {
          animation: candleFlicker6 4.2s ease-in-out infinite;
        }
        
        .animate-candle-7 {
          animation: candleFlicker7 3.3s ease-in-out infinite;
        }
        
        .animate-candle-8 {
          animation: candleFlicker8 4.7s ease-in-out infinite;
        }
        
        .animate-chart-scroll {
          animation: chartScroll 25s linear infinite;
        }
      `}</style>
    </div>
  );
}
