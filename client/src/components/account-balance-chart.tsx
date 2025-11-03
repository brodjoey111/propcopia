import { Card } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface AccountBalanceChartProps {
  data: Array<{ name: string; balance: number; pnl: number }>;
  title: string;
}

export function AccountBalanceChart({ data, title }: AccountBalanceChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pnl = payload[0].payload.pnl;
      const isPositive = pnl >= 0;
      return (
        <div className="rounded-md border bg-card p-3 shadow-md">
          <p className="text-sm font-medium">{payload[0].payload.name}</p>
          <p className="text-xs text-muted-foreground">
            Balance: <span className="font-semibold tabular-nums">${payload[0].value.toLocaleString()}</span>
          </p>
          <p className={`text-xs ${isPositive ? 'text-chart-2' : 'text-destructive'}`}>
            P&L: <span className="font-semibold tabular-nums">{isPositive ? '+' : ''}${pnl.toLocaleString()}</span>
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
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="name"
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
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="balance" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.pnl >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
