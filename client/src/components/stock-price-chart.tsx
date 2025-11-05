import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Bar, Brush, CartesianGrid, ReferenceLine } from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { TrendingUp, Candy, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [brushIndexes, setBrushIndexes] = useState<{ startIndex?: number; endIndex?: number }>({});
  const [yZoom, setYZoom] = useState(1); // 1 is default, <1 zooms out, >1 zooms in

  const { data, isLoading } = useQuery<{ success: boolean; data: { timeframe: string; candles: ChartData[] } }>({
    queryKey: [`/api/stock/${symbol}/chart?timeframe=${selectedTimeframe}`],
    enabled: !!symbol,
  });

  const chartData = data?.data?.candles || [];

  // Get current price (latest close price)
  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].close : 0;

  // Calculate min and max for better chart scaling - use high/low for candlestick mode
  const minPrice = chartType === "candlestick" && chartData.length > 0
    ? Math.min(...chartData.map(d => d.low))
    : chartData.length > 0
    ? Math.min(...chartData.map(d => d.close))
    : 0;
  const maxPrice = chartType === "candlestick" && chartData.length > 0
    ? Math.max(...chartData.map(d => d.high))
    : chartData.length > 0
    ? Math.max(...chartData.map(d => d.close))
    : 0;
  const basePadding = (maxPrice - minPrice) * 0.1 || 1;
  const padding = basePadding / yZoom; // Adjust padding based on zoom level
  
  const handleZoomIn = () => setYZoom(prev => Math.min(prev * 1.5, 10));
  const handleZoomOut = () => setYZoom(prev => Math.max(prev / 1.5, 0.25));
  const handleResetZoom = () => setYZoom(1);

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
    // Darker, more saturated colors for better visibility in light mode
    const color = isPositive ? "#00a804" : "#e63900";
    
    // Calculate positions - larger candles
    const candleWidth = Math.max(width * 0.8, 4);
    const candleX = x + (width - candleWidth) / 2;
    
    // Map prices to y coordinates (higher price = lower y)
    const yScale = height / (maxPrice + padding - (minPrice - padding));
    const getY = (price: number) => y + height - (price - (minPrice - padding)) * yScale;
    
    const highY = getY(high);
    const lowY = getY(low);
    const openY = getY(open);
    const closeY = getY(close);
    
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.abs(closeY - openY) || 2;

    return (
      <g>
        {/* Wick line (high-low) - thicker wick */}
        <line
          x1={x + width / 2}
          y1={highY}
          x2={x + width / 2}
          y2={lowY}
          stroke={color}
          strokeWidth={3}
        />
        {/* Candle body - larger and thicker */}
        <rect
          x={candleX}
          y={bodyTop}
          width={candleWidth}
          height={bodyHeight}
          fill={color}
          stroke={color}
          strokeWidth={3}
          rx={1}
          ry={1}
        />
      </g>
    );
  };

  const ChartContent = ({ height, showBrush = false }: { height: number; showBrush?: boolean }) => (
    <>
      {isLoading ? (
        <Skeleton className="w-full" style={{ height: `${height}px` }} />
      ) : chartData.length > 0 ? (
        <div style={{ height: `${height}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "line" ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
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
                  yAxisId="left"
                  domain={[minPrice - padding, maxPrice + padding]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[minPrice - padding, maxPrice + padding]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  ticks={[currentPrice]}
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
                  cursor={{
                    stroke: isPositive ? "#00c805" : "#ff5000",
                    strokeWidth: 2,
                    strokeDasharray: "3 3"
                  }}
                  wrapperStyle={{ zIndex: 1000 }}
                />
                <ReferenceLine
                  yAxisId="left"
                  y={currentPrice}
                  stroke={isPositive ? "#00c805" : "#ff5000"}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{
                    value: `$${currentPrice.toFixed(2)}`,
                    position: 'right',
                    fill: isPositive ? "#00c805" : "#ff5000",
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}
                />
                {showBrush && <Brush dataKey="timestamp" height={30} stroke="hsl(var(--primary))" onChange={(e: any) => setBrushIndexes(e)} />}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="close"
                  stroke={isPositive ? "#00c805" : "#ff5000"}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={!isExpanded}
                />
              </LineChart>
            ) : (
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
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
                  yAxisId="left"
                  domain={[minPrice - padding, maxPrice + padding]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[minPrice - padding, maxPrice + padding]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  ticks={[currentPrice]}
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
                      const isPositiveCandle = data.close >= data.open;
                      return (
                        <div
                          style={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            padding: "12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          }}
                        >
                          <p className="text-xs mb-2 font-medium text-muted-foreground">{format(new Date(data.timestamp), 'PPpp')}</p>
                          <div className="space-y-1">
                            <p className="text-sm">O: <span className="font-semibold">${data.open.toFixed(2)}</span></p>
                            <p className="text-sm text-[#00c805]">H: <span className="font-semibold">${data.high.toFixed(2)}</span></p>
                            <p className="text-sm text-[#ff5000]">L: <span className="font-semibold">${data.low.toFixed(2)}</span></p>
                            <p className={`text-sm font-bold ${isPositiveCandle ? 'text-[#00c805]' : 'text-[#ff5000]'}`}>
                              C: ${data.close.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{
                    stroke: "hsl(var(--foreground))",
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                    strokeOpacity: 0.5
                  }}
                  wrapperStyle={{ zIndex: 1000 }}
                />
                <ReferenceLine
                  yAxisId="left"
                  y={currentPrice}
                  stroke={isPositive ? "#00c805" : "#ff5000"}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{
                    value: `$${currentPrice.toFixed(2)}`,
                    position: 'right',
                    fill: isPositive ? "#00c805" : "#ff5000",
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}
                />
                {showBrush && <Brush dataKey="timestamp" height={30} stroke="hsl(var(--primary))" onChange={(e: any) => setBrushIndexes(e)} />}
                <Bar
                  yAxisId="left"
                  dataKey="high"
                  shape={CandlestickShape}
                  isAnimationActive={!isExpanded}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ height: `${height}px` }} className="flex items-center justify-center text-muted-foreground">
          <p>No chart data available</p>
        </div>
      )}
    </>
  );

  return (
    <>
    <div className="space-y-4" data-testid="stock-chart">
      {/* Controls Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Chart Type Toggle */}
        <div className="flex gap-2">
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
        
        {/* Zoom and Expand Controls */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={yZoom <= 0.25}
            data-testid="button-zoom-out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetZoom}
            disabled={yZoom === 1}
            data-testid="button-zoom-reset"
          >
            1:1
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={yZoom >= 10}
            data-testid="button-zoom-in"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(true)}
            data-testid="button-expand-stock-chart"
          >
            <Maximize2 className="w-4 h-4 mr-1" />
            Expand
          </Button>
        </div>
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
      <ChartContent height={256} showBrush={false} />
    </div>

    {/* Fullscreen Dialog */}
    <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-6" data-testid="dialog-expanded-stock-chart">
        <DialogTitle className="sr-only">{symbol} Price Chart Expanded View</DialogTitle>
        <DialogDescription className="sr-only">
          Fullscreen view of {symbol} stock price chart with interactive controls and zoom capabilities
        </DialogDescription>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-2xl font-bold">{symbol} Price Chart</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Chart Type Toggle */}
              <div className="flex gap-2">
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
                  variant={chartType === "candlestick" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setChartType("candlestick")}
                  className={chartType === "candlestick" ? "toggle-elevate toggle-elevated" : ""}
                  data-testid="button-chart-type-candlestick-expanded"
                >
                  <Candy className="w-4 h-4 mr-1" />
                  Candles
                </Button>
              </div>
              {/* Zoom Controls */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={yZoom <= 0.25}
                  data-testid="button-zoom-out-expanded"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetZoom}
                  disabled={yZoom === 1}
                  data-testid="button-zoom-reset-expanded"
                >
                  1:1
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={yZoom >= 10}
                  data-testid="button-zoom-in-expanded"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(false)}
                data-testid="button-collapse-stock-chart"
              >
                <Minimize2 className="w-4 h-4 mr-1" />
                Close
              </Button>
            </div>
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
                data-testid={`button-timeframe-${tf.value}-expanded`}
              >
                {tf.label}
              </Button>
            ))}
          </div>

          {/* Expanded Chart with Brush */}
          <ChartContent height={500} showBrush={true} />
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
