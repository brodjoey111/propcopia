import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

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

export function StockPriceChart({ symbol }: StockPriceChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1M");

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

  return (
    <div className="space-y-4" data-testid="stock-chart">
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
