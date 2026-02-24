import { NIBRSFilterChart } from '../components/NIBRSFilterChart';

export function NIBRSPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>Crime Type Filter</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Filter and analyze by specific NIBRS crime categories
        </p>
      </div>
      <div className="bg-card rounded-lg shadow-sm p-4">
        <NIBRSFilterChart groupBy="month" />
      </div>
    </div>
  );
}
