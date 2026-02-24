import { YearlyBarChart } from '../components/YearlyBarChart';

export function YearlyPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>Yearly Comparison</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>Compare crime statistics year by year</p>
      </div>
      <div className="bg-card rounded-lg shadow-sm p-4">
        <YearlyBarChart />
      </div>
    </div>
  );
}
