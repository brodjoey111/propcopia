import { Card } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface PerformanceChartProps {
  data: Array<{ time: string; pnl: number }>;
  title: string;
}

export function PerformanceChart({ data, title }: PerformanceChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const isPositive = value >= 0;
      return (
        <div className="rounded-md border bg-card p-3 shadow-md">
          <p className="text-xs text-muted-foreground">{payload[0].payload.time}</p>
          <p className={`text-sm font-semibold tabular-nums ${isPositive ? 'text-chart-2' : 'text-destructive'}`}>
            {isPositive ? '+' : ''}${value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="time"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="pnl"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            fill="url(#colorPnl)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
