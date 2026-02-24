import { CrimeMap } from '../components/CrimeMap';

export function MapPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>Crime Incident Map</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Interactive map showing crime locations and district boundaries
        </p>
      </div>
      <div className="bg-card rounded-lg shadow-sm p-4">
        <CrimeMap />
      </div>
    </div>
  );
}
