import { YearlyBarChart } from '../components/YearlyBarChart';

export function YearlyPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>Yearly Comparison</h1>
      </div>
      <div className="bg-card rounded-lg shadow-sm p-4">
        <YearlyBarChart />
      </div>
    </div>
  );
}
