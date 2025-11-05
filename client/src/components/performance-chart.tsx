import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, Bar, BarChart } from "recharts";
import { Activity, TrendingUp, BarChart3, Maximize2, Minimize2 } from "lucide-react";

interface PerformanceChartProps {
  data: Array<{ time: string; pnl: number }>;
  title: string;
}

type ChartType = "area" | "line" | "bar";

export function PerformanceChart({ data, title }: PerformanceChartProps) {
  const [chartType, setChartType] = useState<ChartType>("area");
  const [isExpanded, setIsExpanded] = useState(false);
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const isPositive = value >= 0;
      return (
        <div className="rounded-md border bg-card p-3 shadow-lg">
          <p className="text-xs text-muted-foreground mb-1">{payload[0].payload.time}</p>
          <p className={`text-sm font-bold tabular-nums ${isPositive ? 'text-[#00c805]' : 'text-[#ff5000]'}`}>
            {isPositive ? '+' : ''}${value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const ChartContent = ({ height }: { height: number }) => (
    <ResponsiveContainer width="100%" height={height}>
      {chartType === "area" ? (
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
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ stroke: 'hsl(var(--foreground))', strokeWidth: 2, strokeDasharray: '3 3', strokeOpacity: 0.5 }}
            wrapperStyle={{ zIndex: 1000 }}
          />
          <Area
            type="monotone"
            dataKey="pnl"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            fill="url(#colorPnl)"
            isAnimationActive={!isExpanded}
          />
        </AreaChart>
      ) : chartType === "line" ? (
        <LineChart data={data}>
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
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ stroke: 'hsl(var(--foreground))', strokeWidth: 2, strokeDasharray: '3 3', strokeOpacity: 0.5 }}
            wrapperStyle={{ zIndex: 1000 }}
          />
          <Line
            type="monotone"
            dataKey="pnl"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
            isAnimationActive={!isExpanded}
          />
        </LineChart>
      ) : (
        <BarChart data={data}>
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
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} 
            wrapperStyle={{ zIndex: 1000 }}
          />
          <Bar
            dataKey="pnl"
            fill="hsl(var(--chart-2))"
            radius={[8, 8, 0, 0]}
            isAnimationActive={!isExpanded}
          />
        </BarChart>
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
                variant={chartType === "area" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("area")}
                className={chartType === "area" ? "toggle-elevate toggle-elevated h-8" : "h-8"}
                data-testid="button-chart-type-area-perf"
              >
                <Activity className="w-4 h-4" />
              </Button>
              <Button
                variant={chartType === "line" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("line")}
                className={chartType === "line" ? "toggle-elevate toggle-elevated h-8" : "h-8"}
                data-testid="button-chart-type-line-perf"
              >
                <TrendingUp className="w-4 h-4" />
              </Button>
              <Button
                variant={chartType === "bar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("bar")}
                className={chartType === "bar" ? "toggle-elevate toggle-elevated h-8" : "h-8"}
                data-testid="button-chart-type-bar-perf"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(true)}
              data-testid="button-expand-perf-chart"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ChartContent height={300} />
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] p-6" data-testid="dialog-expanded-perf-chart">
          <DialogTitle className="sr-only">{title} Expanded View</DialogTitle>
          <DialogDescription className="sr-only">
            Fullscreen view of performance chart with multiple visualization options
          </DialogDescription>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-bold">{title}</h2>
              <div className="flex items-center gap-2">
                {/* Chart Type Toggle */}
                <div className="flex gap-1">
                  <Button
                    variant={chartType === "area" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setChartType("area")}
                    className={chartType === "area" ? "toggle-elevate toggle-elevated" : ""}
                    data-testid="button-chart-type-area-perf-expanded"
                  >
                    <Activity className="w-4 h-4 mr-1" />
                    Area
                  </Button>
                  <Button
                    variant={chartType === "line" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setChartType("line")}
                    className={chartType === "line" ? "toggle-elevate toggle-elevated" : ""}
                    data-testid="button-chart-type-line-perf-expanded"
                  >
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Line
                  </Button>
                  <Button
                    variant={chartType === "bar" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setChartType("bar")}
                    className={chartType === "bar" ? "toggle-elevate toggle-elevated" : ""}
                    data-testid="button-chart-type-bar-perf-expanded"
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Bar
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  data-testid="button-collapse-perf-chart"
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
