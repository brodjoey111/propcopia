import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Trade {
  id: string;
  date: Date;
  pnl: number;
  symbol: string;
  action: string;
}

interface TradeCalendarProps {
  trades: Trade[];
}

export function TradeCalendar({ trades }: TradeCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Month navigation
  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Group trades by date
  const tradesByDate = new Map<string, Trade[]>();
  trades.forEach((trade) => {
    const dateKey = trade.date.toISOString().split('T')[0];
    if (!tradesByDate.has(dateKey)) {
      tradesByDate.set(dateKey, []);
    }
    tradesByDate.get(dateKey)!.push(trade);
  });

  // Calculate daily P&L
  const getDailyPnL = (date: Date): number => {
    const dateKey = date.toISOString().split('T')[0];
    const dayTrades = tradesByDate.get(dateKey) || [];
    return dayTrades.reduce((sum, trade) => sum + trade.pnl, 0);
  };

  // Calculate weekly totals
  const getWeeklyTotals = (): { week: number; total: number; days: Date[] }[] => {
    const weeks: { week: number; total: number; days: Date[] }[] = [];
    let currentWeek: Date[] = [];
    let weekTotal = 0;

    for (let i = 0; i < startingDayOfWeek; i++) {
      currentWeek.push(new Date(year, month, 1 - (startingDayOfWeek - i)));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      currentWeek.push(date);
      weekTotal += getDailyPnL(date);

      if (date.getDay() === 6 || day === daysInMonth) {
        weeks.push({ week: weeks.length + 1, total: weekTotal, days: [...currentWeek] });
        currentWeek = [];
        weekTotal = 0;
      }
    }

    return weeks;
  };

  // Calculate monthly total
  const monthlyTotal = trades
    .filter((trade) => {
      return trade.date.getMonth() === month && trade.date.getFullYear() === year;
    })
    .reduce((sum, trade) => sum + trade.pnl, 0);

  const weeks = getWeeklyTotals();
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Card className="card-3d p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{monthName}</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={previousMonth}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              data-testid="button-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Monthly Total */}
        <div className="rounded-md border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Monthly Total</span>
            <span
              className={`text-2xl font-bold tabular-nums ${
                monthlyTotal >= 0 ? 'text-chart-2' : 'text-destructive'
              }`}
              data-testid="text-monthly-total"
            >
              {monthlyTotal >= 0 ? '+' : ''}${monthlyTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div>
          {/* Day headers */}
          <div className="grid grid-cols-8 gap-2 mb-2">
            <div className="text-xs font-semibold text-muted-foreground text-center">Week</div>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-xs font-semibold text-muted-foreground text-center">
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-8 gap-2 mb-2">
              {/* Week total */}
              <div className="flex items-center justify-center rounded-md bg-muted p-2">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">W{week.week}</div>
                  <div
                    className={`text-xs font-semibold tabular-nums ${
                      week.total >= 0 ? 'text-chart-2' : 'text-destructive'
                    }`}
                  >
                    {week.total >= 0 ? '+' : ''}${week.total.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Days */}
              {week.days.map((date, dayIndex) => {
                const isCurrentMonth = date.getMonth() === month;
                const dayPnL = getDailyPnL(date);
                const hasTrades = tradesByDate.has(date.toISOString().split('T')[0]);
                const isToday =
                  date.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={dayIndex}
                    className={`relative min-h-[80px] rounded-md border p-2 ${
                      isCurrentMonth ? 'bg-card' : 'bg-muted/30'
                    } ${isToday ? 'ring-2 ring-primary' : ''}`}
                    data-testid={`calendar-day-${date.getDate()}`}
                  >
                    <div className="text-xs font-medium text-muted-foreground">
                      {date.getDate()}
                    </div>
                    {hasTrades && isCurrentMonth && (
                      <div className="mt-1">
                        <div
                          className={`text-xs font-semibold tabular-nums ${
                            dayPnL >= 0 ? 'text-chart-2' : 'text-destructive'
                          }`}
                        >
                          {dayPnL >= 0 ? '+' : ''}${dayPnL.toLocaleString()}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {tradesByDate.get(date.toISOString().split('T')[0])!.length} trades
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-chart-2/20"></div>
            <span>Profitable Day</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-destructive/20"></div>
            <span>Loss Day</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded border-2 border-primary"></div>
            <span>Today</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
