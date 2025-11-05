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

// TradingView-inspired colors
const BULLISH_COLOR = "#089981"; // TradingView green
const BEARISH_COLOR = "#F23645"; // TradingView red
const WICK_COLOR_BULL = "#089981";
const WICK_COLOR_BEAR = "#F23645";

export function StockPriceChart({ symbol }: StockPriceChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1M");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [isExpanded, setIsExpanded] = useState(false);
  const [brushIndexes, setBrushIndexes] = useState<{ startIndex?: number; endIndex?: number }>({});
  const [yZoom, setYZoom] = useState(1);

  const { data, isLoading } = useQuery<{ success: boolean; data: { timeframe: string; candles: ChartData[] } }>({
    queryKey: [`/api/stock/${symbol}/chart?timeframe=${selectedTimeframe}`],
    enabled: !!symbol,
    refetchInterval: 15000,
  });

  const chartData = data?.data?.candles || [];

  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].close : 0;

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
  const padding = basePadding / yZoom;
  
  const handleZoomIn = () => setYZoom(prev => Math.min(prev * 1.5, 10));
  const handleZoomOut = () => setYZoom(prev => Math.max(prev / 1.5, 0.25));
  const handleResetZoom = () => setYZoom(1);

  const isPositive = chartData.length > 1 && chartData[chartData.length - 1].close >= chartData[0].close;

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

  // TradingView-style candlestick shape
  const CandlestickShape = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (!payload) return <g />;

    const { open, close, high, low } = payload;
    const isBullish = close >= open;
    const bodyColor = isBullish ? BULLISH_COLOR : BEARISH_COLOR;
    const wickColor = isBullish ? WICK_COLOR_BULL : WICK_COLOR_BEAR;
    
    // TradingView-style: larger candles with proper spacing
    const candleWidth = Math.max(width * 0.7, 3);
    const candleX = x + (width - candleWidth) / 2;
    
    // Map prices to y coordinates
    const yScale = height / (maxPrice + padding - (minPrice - padding));
    const getY = (price: number) => y + height - (price - (minPrice - padding)) * yScale;
    
    const highY = getY(high);
    const lowY = getY(low);
    const openY = getY(open);
    const closeY = getY(close);
    
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(Math.abs(closeY - openY), 1);

    return (
      <g>
        {/* Thin wick line (TradingView style: 1px) */}
        <line
          x1={x + width / 2}
          y1={highY}
          x2={x + width / 2}
          y2={lowY}
          stroke={wickColor}
          strokeWidth={1}
          opacity={0.9}
        />
        {/* Candle body - no border, just fill (TradingView style) */}
        <rect
          x={candleX}
          y={bodyTop}
          width={candleWidth}
          height={bodyHeight}
          fill={bodyColor}
          stroke="none"
          rx={0}
          ry={0}
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
                <CartesianGrid 
                  strokeDasharray="0" 
                  stroke="hsl(var(--border))" 
                  opacity={0.15}
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXAxis}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="left"
                  domain={[minPrice - padding, maxPrice + padding]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  width={60}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[minPrice - padding, maxPrice + padding]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  ticks={[currentPrice]}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "4px",
                    padding: "8px 12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                  labelFormatter={(timestamp) => format(new Date(timestamp), 'PPpp')}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                  cursor={{
                    stroke: isPositive ? BULLISH_COLOR : BEARISH_COLOR,
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                    strokeOpacity: 0.5
                  }}
                  wrapperStyle={{ zIndex: 1000 }}
                />
                <ReferenceLine
                  yAxisId="left"
                  y={currentPrice}
                  stroke={isPositive ? BULLISH_COLOR : BEARISH_COLOR}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  strokeOpacity={0.6}
                  label={{
                    value: `$${currentPrice.toFixed(2)}`,
                    position: 'right',
                    fill: isPositive ? BULLISH_COLOR : BEARISH_COLOR,
                    fontSize: 11,
                    fontWeight: 'bold'
                  }}
                />
                {showBrush && <Brush dataKey="timestamp" height={30} stroke="hsl(var(--primary))" onChange={(e: any) => setBrushIndexes(e)} />}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="close"
                  stroke={isPositive ? BULLISH_COLOR : BEARISH_COLOR}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={!isExpanded}
                />
              </LineChart>
            ) : (
              <ComposedChart data={chartData}>
                <CartesianGrid 
                  strokeDasharray="0" 
                  stroke="hsl(var(--border))" 
                  opacity={0.15}
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXAxis}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="left"
                  domain={[minPrice - padding, maxPrice + padding]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  width={60}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[minPrice - padding, maxPrice + padding]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  ticks={[currentPrice]}
                  width={60}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      const isBullish = data.close >= data.open;
                      const change = data.close - data.open;
                      const changePercent = ((change / data.open) * 100);
                      
                      return (
                        <div
                          style={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "4px",
                            padding: "10px 14px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            minWidth: "180px"
                          }}
                        >
                          <p className="text-xs mb-2 font-medium text-muted-foreground">
                            {format(new Date(data.timestamp), 'MMM dd, yyyy HH:mm')}
                          </p>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">O</span>
                              <span className="font-semibold">${data.open.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">H</span>
                              <span className="font-semibold" style={{ color: BULLISH_COLOR }}>${data.high.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">L</span>
                              <span className="font-semibold" style={{ color: BEARISH_COLOR }}>${data.low.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-4 pt-1 border-t border-border">
                              <span className="text-muted-foreground">C</span>
                              <span className="font-bold" style={{ color: isBullish ? BULLISH_COLOR : BEARISH_COLOR }}>
                                ${data.close.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4 text-xs">
                              <span className="text-muted-foreground">Change</span>
                              <span className="font-semibold" style={{ color: isBullish ? BULLISH_COLOR : BEARISH_COLOR }}>
                                {isBullish ? '+' : ''}{change.toFixed(2)} ({isBullish ? '+' : ''}{changePercent.toFixed(2)}%)
                              </span>
                            </div>
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
                    strokeOpacity: 0.3
                  }}
                  wrapperStyle={{ zIndex: 1000 }}
                />
                <ReferenceLine
                  yAxisId="left"
                  y={currentPrice}
                  stroke={isPositive ? BULLISH_COLOR : BEARISH_COLOR}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  strokeOpacity={0.6}
                  label={{
                    value: `$${currentPrice.toFixed(2)}`,
                    position: 'right',
                    fill: isPositive ? BULLISH_COLOR : BEARISH_COLOR,
                    fontSize: 11,
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
