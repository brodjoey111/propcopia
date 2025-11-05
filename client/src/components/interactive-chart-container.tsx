import { useState, ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";

interface InteractiveChartContainerProps {
  title: string;
  children: ReactNode;
  chartTypeToggle?: ReactNode;
  height?: number;
  expandedHeight?: number;
  showZoomControls?: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  className?: string;
}

export function InteractiveChartContainer({
  title,
  children,
  chartTypeToggle,
  height = 300,
  expandedHeight = 600,
  showZoomControls = false,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  className = "",
}: InteractiveChartContainerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Normal View */}
      <Card className={`card-3d p-6 ${className}`}>
        <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-semibold">{title}</h3>
          <div className="flex items-center gap-2">
            {chartTypeToggle}
            {showZoomControls && (
              <div className="flex gap-1">
                {onZoomIn && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onZoomIn}
                    data-testid="button-zoom-in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                )}
                {onZoomOut && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onZoomOut}
                    data-testid="button-zoom-out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                )}
                {onResetZoom && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onResetZoom}
                    data-testid="button-reset-zoom"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsExpanded(true)}
              data-testid="button-expand-chart"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div style={{ height: `${height}px` }}>
          {children}
        </div>
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-6" data-testid="dialog-expanded-chart">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-2xl font-bold">{title}</h2>
              <div className="flex items-center gap-2">
                {chartTypeToggle}
                {showZoomControls && (
                  <div className="flex gap-1">
                    {onZoomIn && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onZoomIn}
                        data-testid="button-zoom-in-expanded"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    )}
                    {onZoomOut && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onZoomOut}
                        data-testid="button-zoom-out-expanded"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                    )}
                    {onResetZoom && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onResetZoom}
                        data-testid="button-reset-zoom-expanded"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(false)}
                  data-testid="button-collapse-chart"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div style={{ height: `${expandedHeight}px` }}>
              {children}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
