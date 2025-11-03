import { Card } from "@/components/ui/card";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface TradeDistributionChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  title: string;
}

export function TradeDistributionChart({ data, title }: TradeDistributionChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-md border bg-card p-3 shadow-md">
          <p className="text-sm font-medium">{payload[0].name}</p>
          <p className="text-xs text-muted-foreground">
            Trades: <span className="font-semibold tabular-nums">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="card-3d p-6">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width="50%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm">{item.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">{item.value}</p>
                <p className="text-xs text-muted-foreground">
                  {((item.value / total) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
