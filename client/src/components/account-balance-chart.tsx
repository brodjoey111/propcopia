import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, Area, AreaChart } from "recharts";
import { BarChart3, TrendingUp, Activity, Maximize2, Minimize2 } from "lucide-react";

interface AccountBalanceChartProps {
  data: Array<{ name: string; balance: number; pnl: number }>;
  title: string;
}

type ChartType = "bar" | "line" | "area";

export function AccountBalanceChart({ data, title }: AccountBalanceChartProps) {
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [isExpanded, setIsExpanded] = useState(false);
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pnl = payload[0].payload.pnl;
      const isPositive = pnl >= 0;
      return (
        <div className="rounded-md border bg-card p-3 shadow-lg">
          <p className="text-sm font-semibold mb-1">{payload[0].payload.name}</p>
          <p className="text-sm text-muted-foreground">
            Balance: <span className="font-bold tabular-nums">${payload[0].value.toLocaleString()}</span>
          </p>
          <p className={`text-sm font-semibold ${isPositive ? 'text-[#00c805]' : 'text-[#ff5000]'}`}>
            P&L: {isPositive ? '+' : ''}${pnl.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const ChartContent = ({ height }: { height: number }) => (
    <ResponsiveContainer width="100%" height={height}>
      {chartType === "bar" ? (
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
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} 
            wrapperStyle={{ zIndex: 1000 }}
          />
          <Bar dataKey="balance" radius={[8, 8, 0, 0]} isAnimationActive={!isExpanded}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.pnl >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'}
              />
            ))}
          </Bar>
        </BarChart>
      ) : chartType === "line" ? (
        <LineChart data={data}>
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
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ stroke: 'hsl(var(--foreground))', strokeWidth: 2, strokeDasharray: '3 3', strokeOpacity: 0.5 }}
            wrapperStyle={{ zIndex: 1000 }}
          />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
            isAnimationActive={!isExpanded}
          />
        </LineChart>
      ) : (
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ stroke: 'hsl(var(--foreground))', strokeWidth: 2, strokeDasharray: '3 3', strokeOpacity: 0.5 }}
            wrapperStyle={{ zIndex: 1000 }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            fill="url(#colorBalance)"
            isAnimationActive={!isExpanded}
          />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );

  return (
    <>
      <Card className="card-3d p-6">
        <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-semibold">{title}</h3>
          <div className="flex items-center gap-2">
            {/* Chart Type Toggle */}
            <div className="flex gap-1">
              <Button
                variant={chartType === "bar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("bar")}
                className={chartType === "bar" ? "toggle-elevate toggle-elevated h-8" : "h-8"}
                data-testid="button-chart-type-bar"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
              <Button
                variant={chartType === "line" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("line")}
                className={chartType === "line" ? "toggle-elevate toggle-elevated h-8" : "h-8"}
                data-testid="button-chart-type-line-balance"
              >
                <TrendingUp className="w-4 h-4" />
              </Button>
              <Button
                variant={chartType === "area" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("area")}
                className={chartType === "area" ? "toggle-elevate toggle-elevated h-8" : "h-8"}
                data-testid="button-chart-type-area"
              >
                <Activity className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(true)}
              data-testid="button-expand-balance-chart"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ChartContent height={300} />
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] p-6" data-testid="dialog-expanded-balance-chart">
          <DialogTitle className="sr-only">{title} Expanded View</DialogTitle>
          <DialogDescription className="sr-only">
            Fullscreen view of account balance chart with multiple visualization options
          </DialogDescription>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-bold">{title}</h2>
              <div className="flex items-center gap-2">
                {/* Chart Type Toggle */}
                <div className="flex gap-1">
                  <Button
                    variant={chartType === "bar" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setChartType("bar")}
                    className={chartType === "bar" ? "toggle-elevate toggle-elevated" : ""}
                    data-testid="button-chart-type-bar-expanded"
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Bar
                  </Button>
                  <Button
                    variant={chartType === "line" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setChartType("line")}
                    className={chartType === "line" ? "toggle-elevate toggle-elevated" : ""}
                    data-testid="button-chart-type-line-expanded"
                  >
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Line
                  </Button>
                  <Button
                    variant={chartType === "area" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setChartType("area")}
                    className={chartType === "area" ? "toggle-elevate toggle-elevated" : ""}
                    data-testid="button-chart-type-area-expanded"
                  >
                    <Activity className="w-4 h-4 mr-1" />
                    Area
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  data-testid="button-collapse-balance-chart"
                >
                  <Minimize2 className="w-4 h-4 mr-1" />
                  Close
                </Button>
              </div>
            </div>
            <ChartContent height={500} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
