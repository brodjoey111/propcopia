import { PerformanceChart } from '../performance-chart';

export default function PerformanceChartExample() {
  const mockData = [
    { time: '9:00', pnl: 0 },
    { time: '9:30', pnl: 450 },
    { time: '10:00', pnl: 320 },
    { time: '10:30', pnl: 890 },
    { time: '11:00', pnl: 1240 },
    { time: '11:30', pnl: 1580 },
    { time: '12:00', pnl: 2100 },
    { time: '12:30', pnl: 2450 },
    { time: '13:00', pnl: 3100 },
  ];

  return (
    <div className="p-6">
      <PerformanceChart data={mockData} title="Today's Performance" />
    </div>
  );
}
