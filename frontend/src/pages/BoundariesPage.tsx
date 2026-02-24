import { BoundariesMap } from '../components/BoundariesMap';

export function BoundariesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>District Boundaries</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          View the Prestonwood district boundary (red) and buffer zone (blue) without crime incident overlays.
        </p>
      </div>
      <div className="bg-card rounded-lg shadow-sm p-4">
        <BoundariesMap />
      </div>
    </div>
  );
}
