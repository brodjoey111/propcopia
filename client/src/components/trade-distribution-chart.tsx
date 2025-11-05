import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { PieChart as PieChartIcon, Donut, BarChart3, Maximize2, Minimize2 } from "lucide-react";

interface TradeDistributionChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  title: string;
}

type ChartType = "pie" | "donut" | "bar";

export function TradeDistributionChart({ data, title }: TradeDistributionChartProps) {
  const [chartType, setChartType] = useState<ChartType>("donut");
  const [isExpanded, setIsExpanded] = useState(false);
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

  const Legend = () => (
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
  );

  const ChartContent = ({ height, showLegend = true }: { height: number; showLegend?: boolean }) => (
    <div className={showLegend ? "flex items-center gap-6" : ""}>
      <ResponsiveContainer width={showLegend ? "50%" : "100%"} height={height}>
        {chartType === "pie" ? (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={height * 0.35}
              paddingAngle={2}
              dataKey="value"
              isAnimationActive={!isExpanded}
              label={(entry) => `${entry.name}: ${((entry.value / total) * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        ) : chartType === "donut" ? (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={height * 0.25}
              outerRadius={height * 0.35}
              paddingAngle={2}
              dataKey="value"
              isAnimationActive={!isExpanded}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        ) : (
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
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive={!isExpanded}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
      {showLegend && <Legend />}
    </div>
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
                variant={chartType === "pie" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("pie")}
                className={chartType === "pie" ? "toggle-elevate toggle-elevated h-8" : "h-8"}
                data-testid="button-chart-type-pie"
              >
                <PieChartIcon className="w-4 h-4" />
              </Button>
              <Button
                variant={chartType === "donut" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("donut")}
                className={chartType === "donut" ? "toggle-elevate toggle-elevated h-8" : "h-8"}
                data-testid="button-chart-type-donut"
              >
                <Donut className="w-4 h-4" />
              </Button>
              <Button
                variant={chartType === "bar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("bar")}
                className={chartType === "bar" ? "toggle-elevate toggle-elevated h-8" : "h-8"}
                data-testid="button-chart-type-bar-dist"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(true)}
              data-testid="button-expand-dist-chart"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ChartContent height={200} showLegend={true} />
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] p-6" data-testid="dialog-expanded-dist-chart">
          <DialogTitle className="sr-only">{title} Expanded View</DialogTitle>
          <DialogDescription className="sr-only">
            Fullscreen view of trade distribution chart with multiple visualization options
          </DialogDescription>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-bold">{title}</h2>
              <div className="flex items-center gap-2">
                {/* Chart Type Toggle */}
                <div className="flex gap-1">
                  <Button
                    variant={chartType === "pie" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setChartType("pie")}
                    className={chartType === "pie" ? "toggle-elevate toggle-elevated" : ""}
                    data-testid="button-chart-type-pie-expanded"
                  >
                    <PieChartIcon className="w-4 h-4 mr-1" />
                    Pie
                  </Button>
                  <Button
                    variant={chartType === "donut" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setChartType("donut")}
                    className={chartType === "donut" ? "toggle-elevate toggle-elevated" : ""}
                    data-testid="button-chart-type-donut-expanded"
                  >
                    <Donut className="w-4 h-4 mr-1" />
                    Donut
                  </Button>
                  <Button
                    variant={chartType === "bar" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setChartType("bar")}
                    className={chartType === "bar" ? "toggle-elevate toggle-elevated" : ""}
                    data-testid="button-chart-type-bar-dist-expanded"
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Bar
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  data-testid="button-collapse-dist-chart"
                >
                  <Minimize2 className="w-4 h-4 mr-1" />
                  Close
                </Button>
              </div>
            </div>
            <ChartContent height={500} showLegend={false} />
            <Legend />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
