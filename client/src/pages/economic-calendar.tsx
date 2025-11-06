import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, TrendingUp, TrendingDown, AlertCircle, Clock, Globe, BarChart3 } from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isPast } from "date-fns";

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  country: string;
  event: string;
  impact: "high" | "medium" | "low";
  actual?: string;
  forecast?: string;
  previous?: string;
}

export default function EconomicCalendar() {
  const [selectedEvent, setSelectedEvent] = useState<EconomicEvent | null>(null);
  
  const { data: events, isLoading } = useQuery<EconomicEvent[]>({
    queryKey: ["/api/economic-calendar"],
  });

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-destructive text-destructive-foreground";
      case "medium":
        return "bg-chart-4 text-white";
      case "low":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "high":
        return <AlertCircle className="h-3 w-3" />;
      case "medium":
        return <TrendingUp className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const formatEventDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d, yyyy");
  };

  const groupEventsByDate = (events: EconomicEvent[]) => {
    const grouped: { [key: string]: EconomicEvent[] } = {};
    events?.forEach((event) => {
      const dateKey = event.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold" data-testid="heading-calendar">
            Economic Calendar
          </h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading economic events...</p>
          </div>
        </div>
      </div>
    );
  }

  const groupedEvents = groupEventsByDate(events || []);
  const sortedDates = Object.keys(groupedEvents).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-calendar">
            Economic Calendar
          </h1>
          <p className="mt-1 text-muted-foreground">
            Track upcoming economic events that may impact futures markets
          </p>
        </div>
        <Calendar className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Impact Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Impact Levels</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Badge className={getImpactColor("high")} data-testid="badge-high-impact">
              <AlertCircle className="mr-1 h-3 w-3" />
              High
            </Badge>
            <span className="text-xs text-muted-foreground">Major market impact expected</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getImpactColor("medium")} data-testid="badge-medium-impact">
              <TrendingUp className="mr-1 h-3 w-3" />
              Medium
            </Badge>
            <span className="text-xs text-muted-foreground">Moderate volatility possible</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getImpactColor("low")} data-testid="badge-low-impact">
              Low
            </Badge>
            <span className="text-xs text-muted-foreground">Minimal market impact</span>
          </div>
        </CardContent>
      </Card>

      {/* Events by Date */}
      <div className="space-y-6">
        {sortedDates.map((dateKey) => {
          const dateEvents = groupedEvents[dateKey];
          const isPastDate = isPast(parseISO(dateKey)) && !isToday(parseISO(dateKey));

          return (
            <div key={dateKey} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2
                  className={`text-lg font-semibold ${isPastDate ? "text-muted-foreground" : ""}`}
                  data-testid={`heading-date-${dateKey}`}
                >
                  {formatEventDate(dateKey)}
                </h2>
                <div className="h-px flex-1 bg-border"></div>
              </div>

              <div className="space-y-2">
                {dateEvents.map((event) => (
                  <Card
                    key={event.id}
                    className={`hover-elevate active-elevate-2 cursor-pointer ${isPastDate ? "opacity-60" : ""}`}
                    data-testid={`card-event-${event.id}`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      {/* Time */}
                      <div className="flex w-20 flex-col items-center">
                        <span className="text-sm font-mono font-semibold tabular-nums">
                          {event.time}
                        </span>
                      </div>

                      {/* Country Flag/Code */}
                      <div className="flex w-12 items-center justify-center">
                        <Badge variant="outline" className="font-mono text-xs">
                          {event.country}
                        </Badge>
                      </div>

                      {/* Event Name */}
                      <div className="flex-1">
                        <div className="font-medium">{event.event}</div>
                      </div>

                      {/* Impact Badge */}
                      <div className="flex w-24 justify-center">
                        <Badge className={getImpactColor(event.impact)}>
                          {getImpactIcon(event.impact)}
                          <span className="ml-1 capitalize">{event.impact}</span>
                        </Badge>
                      </div>

                      {/* Data Points */}
                      <div className="flex gap-6 text-sm tabular-nums">
                        {event.actual && (
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">Actual</div>
                            <div className="font-semibold">{event.actual}</div>
                          </div>
                        )}
                        {event.forecast && (
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">Forecast</div>
                            <div>{event.forecast}</div>
                          </div>
                        )}
                        {event.previous && (
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">Previous</div>
                            <div className="text-muted-foreground">{event.previous}</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {(!events || events.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Calendar className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No upcoming economic events</p>
          </CardContent>
        </Card>
      )}

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-event-details">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Badge className={getImpactColor(selectedEvent?.impact || "low")}>
                {getImpactIcon(selectedEvent?.impact || "low")}
                <span className="ml-1 capitalize">{selectedEvent?.impact}</span>
              </Badge>
              {selectedEvent?.event}
            </DialogTitle>
            <DialogDescription>
              Detailed information about this economic event
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-6">
              {/* Event Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Date & Time</div>
                      <div className="font-semibold">
                        {formatEventDate(selectedEvent.date)} at {selectedEvent.time}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Country</div>
                      <div className="font-semibold">{selectedEvent.country}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Data Comparison */}
              {(selectedEvent.actual || selectedEvent.forecast || selectedEvent.previous) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-4 w-4" />
                      Economic Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {selectedEvent.previous && (
                        <div className="text-center space-y-2">
                          <div className="text-sm text-muted-foreground">Previous</div>
                          <div className="text-2xl font-bold tabular-nums">
                            {selectedEvent.previous}
                          </div>
                          <div className="text-xs text-muted-foreground">Last release</div>
                        </div>
                      )}
                      
                      {selectedEvent.forecast && (
                        <div className="text-center space-y-2">
                          <div className="text-sm text-muted-foreground">Forecast</div>
                          <div className="text-2xl font-bold tabular-nums text-chart-4">
                            {selectedEvent.forecast}
                          </div>
                          <div className="text-xs text-muted-foreground">Market expectation</div>
                        </div>
                      )}
                      
                      {selectedEvent.actual && (
                        <div className="text-center space-y-2">
                          <div className="text-sm text-muted-foreground">Actual</div>
                          <div className="text-2xl font-bold tabular-nums text-primary">
                            {selectedEvent.actual}
                          </div>
                          <div className="text-xs text-muted-foreground">Released value</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Impact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Market Impact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium mb-1">Impact Level: {selectedEvent.impact === 'high' ? 'High' : selectedEvent.impact === 'medium' ? 'Medium' : 'Low'}</div>
                      <p className="text-sm text-muted-foreground">
                        {selectedEvent.impact === 'high' && 
                          'This event is expected to cause significant market volatility. Major price movements are likely across related futures contracts. Consider adjusting position sizes and stop losses accordingly.'}
                        {selectedEvent.impact === 'medium' && 
                          'This event may cause moderate market volatility. Price movements are possible in related futures contracts. Monitor positions closely during the release.'}
                        {selectedEvent.impact === 'low' && 
                          'This event typically has minimal market impact. Minor price fluctuations may occur but significant moves are unlikely.'}
                      </p>
                    </div>
                  </div>

                  {selectedEvent.impact === 'high' && (
                    <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-destructive mb-1">Trading Caution</div>
                        <p className="text-sm text-muted-foreground">
                          High-impact events can lead to rapid price swings and increased slippage. Consider reducing leverage and widening stop losses during this period.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Related Markets */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Potentially Affected Markets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.country === 'US' && (
                      <>
                        <Badge variant="outline" data-testid="badge-market-es">ES (S&P 500)</Badge>
                        <Badge variant="outline" data-testid="badge-market-nq">NQ (Nasdaq)</Badge>
                        <Badge variant="outline" data-testid="badge-market-ym">YM (Dow Jones)</Badge>
                        <Badge variant="outline" data-testid="badge-market-rty">RTY (Russell 2000)</Badge>
                      </>
                    )}
                    {selectedEvent.event.toLowerCase().includes('oil') && (
                      <Badge variant="outline" data-testid="badge-market-cl">CL (Crude Oil)</Badge>
                    )}
                    {selectedEvent.event.toLowerCase().includes('gold') && (
                      <Badge variant="outline" data-testid="badge-market-gc">GC (Gold)</Badge>
                    )}
                    {(selectedEvent.event.toLowerCase().includes('cpi') || 
                      selectedEvent.event.toLowerCase().includes('inflation')) && (
                      <>
                        <Badge variant="outline" data-testid="badge-market-zt">ZT (2-Year Treasury)</Badge>
                        <Badge variant="outline" data-testid="badge-market-zn">ZN (10-Year Treasury)</Badge>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
