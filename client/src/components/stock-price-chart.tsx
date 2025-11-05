import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Bar, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { TrendingUp, Candy } from "lucide-react";

interface ChartData {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockPriceChartProps {
  symbol: string;
}

const timeframes = [
  { label: "1D", value: "1D" },
  { label: "5D", value: "5D" },
  { label: "1M", value: "1M" },
  { label: "6M", value: "6M" },
  { label: "1Y", value: "1Y" },
  { label: "5Y", value: "5Y" },
];

type ChartType = "line" | "candlestick";

export function StockPriceChart({ symbol }: StockPriceChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1M");
  const [chartType, setChartType] = useState<ChartType>("line");

  const { data, isLoading } = useQuery<{ success: boolean; data: { timeframe: string; candles: ChartData[] } }>({
    queryKey: [`/api/stock/${symbol}/chart?timeframe=${selectedTimeframe}`],
    enabled: !!symbol,
  });

  const chartData = data?.data?.candles || [];

  // Calculate min and max for better chart scaling
  const prices = chartData.map(d => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1;

  // Determine if price is going up or down
  const isPositive = chartData.length > 1 && chartData[chartData.length - 1].close >= chartData[0].close;

  // Format date based on timeframe
  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    if (selectedTimeframe === '1D') {
      return format(date, 'HH:mm');
    } else if (selectedTimeframe === '5D') {
      return format(date, 'EEE HH:mm');
    } else if (selectedTimeframe === '1M') {
      return format(date, 'MMM dd');
    } else {
      return format(date, 'MMM yyyy');
    }
  };

  // Custom candlestick shape
  const CandlestickShape = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (!payload) return <g />;

    const { open, close, high, low } = payload;
    const isPositive = close >= open;
    const color = isPositive ? "#00c805" : "#ff5000";
    
    // Calculate positions
    const candleWidth = Math.max(width * 0.6, 2);
    const candleX = x + (width - candleWidth) / 2;
    
    // Map prices to y coordinates (higher price = lower y)
    const yScale = height / (maxPrice + padding - (minPrice - padding));
    const getY = (price: number) => y + height - (price - (minPrice - padding)) * yScale;
    
    const highY = getY(high);
    const lowY = getY(low);
    const openY = getY(open);
    const closeY = getY(close);
    
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.abs(closeY - openY) || 1;

    return (
      <g>
        {/* Wick line (high-low) */}
        <line
          x1={x + width / 2}
          y1={highY}
          x2={x + width / 2}
          y2={lowY}
          stroke={color}
          strokeWidth={1}
        />
        {/* Candle body */}
        <rect
          x={candleX}
          y={bodyTop}
          width={candleWidth}
          height={bodyHeight}
          fill={color}
          stroke={color}
          strokeWidth={1}
        />
      </g>
    );
  };

  return (
    <div className="space-y-4" data-testid="stock-chart">
      {/* Chart Type Toggle */}
      <div className="flex gap-2 justify-center">
        <Button
          variant={chartType === "line" ? "default" : "ghost"}
          size="sm"
          onClick={() => setChartType("line")}
          className={chartType === "line" ? "toggle-elevate toggle-elevated" : ""}
          data-testid="button-chart-type-line"
        >
          <TrendingUp className="w-4 h-4 mr-1" />
          Line
        </Button>
        <Button
          variant={chartType === "candlestick" ? "default" : "ghost"}
          size="sm"
          onClick={() => setChartType("candlestick")}
          className={chartType === "candlestick" ? "toggle-elevate toggle-elevated" : ""}
          data-testid="button-chart-type-candlestick"
        >
          <Candy className="w-4 h-4 mr-1" />
          Candles
        </Button>
      </div>

      {/* Timeframe buttons */}
      <div className="flex gap-1 justify-center">
        {timeframes.map((tf) => (
          <Button
            key={tf.value}
            variant={selectedTimeframe === tf.value ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedTimeframe(tf.value)}
            className={selectedTimeframe === tf.value ? "toggle-elevate toggle-elevated" : ""}
            data-testid={`button-timeframe-${tf.value}`}
          >
            {tf.label}
          </Button>
        ))}
      </div>

      {/* Chart */}
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : chartData.length > 0 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "line" ? (
              <LineChart data={chartData}>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXAxis}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[minPrice - padding, maxPrice + padding]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    padding: "8px",
                  }}
                  labelFormatter={(timestamp) => format(new Date(timestamp), 'PPpp')}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                />
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke={isPositive ? "#00c805" : "#ff5000"}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            ) : (
              <ComposedChart data={chartData}>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXAxis}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[minPrice - padding, maxPrice + padding]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    padding: "8px",
                  }}
                  labelFormatter={(timestamp) => format(new Date(timestamp), 'PPpp')}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      open: 'Open',
                      high: 'High',
                      low: 'Low',
                      close: 'Close'
                    };
                    return [`$${value.toFixed(2)}`, labels[name] || name];
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div
                          style={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            padding: "8px",
                          }}
                        >
                          <p className="text-xs mb-2">{format(new Date(data.timestamp), 'PPpp')}</p>
                          <p className="text-xs">Open: ${data.open.toFixed(2)}</p>
                          <p className="text-xs">High: ${data.high.toFixed(2)}</p>
                          <p className="text-xs">Low: ${data.low.toFixed(2)}</p>
                          <p className="text-xs font-semibold">Close: ${data.close.toFixed(2)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="high"
                  shape={CandlestickShape}
                  isAnimationActive={false}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <p>No chart data available</p>
        </div>
      )}
    </div>
  );
}
