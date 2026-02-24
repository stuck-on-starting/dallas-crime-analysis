import { TimeSeriesChart } from '../components/TimeSeriesChart';

export function TimeSeriesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>Time Series Analysis</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>View crime trends over time</p>
      </div>
      <div className="bg-card rounded-lg shadow-sm p-4">
        <TimeSeriesChart groupBy="month" />
      </div>
    </div>
  );
}
