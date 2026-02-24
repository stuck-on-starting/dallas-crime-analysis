import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function OverviewPage() {
  const { data: overview, isLoading, error } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api.getOverview(),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>Overview Statistics</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>Summary of all crime data in the system</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-4 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-10 w-24 mx-auto" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>Overview Statistics</h1>
        <Alert variant="destructive">
          <AlertDescription>
            Error loading data: {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const pct = (n: number) =>
    overview ? ((n / overview.totalRecords) * 100).toFixed(2) + '%' : '';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>Overview Statistics</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>Summary of all crime data in the system</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-4xl font-bold">{overview?.totalRecords.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
              Inside District
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-4xl font-bold">{overview?.categoryDistribution.inside.toLocaleString()}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--accent)' }}>{pct(overview?.categoryDistribution.inside ?? 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
              Bordering District
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-4xl font-bold">{overview?.categoryDistribution.bordering.toLocaleString()}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--accent)' }}>{pct(overview?.categoryDistribution.bordering ?? 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
              Outside District
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-4xl font-bold">{overview?.categoryDistribution.outside.toLocaleString()}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--accent)' }}>{pct(overview?.categoryDistribution.outside ?? 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
              Date Range
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-2xl font-bold">
              {overview && new Date(overview.dateRange.earliest).getFullYear()} –{' '}
              {overview && new Date(overview.dateRange.latest).getFullYear()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
              Crime Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-4xl font-bold">{overview?.nibrsCategories}</p>
          </CardContent>
        </Card>
      </div>

      <footer className="text-center py-4 text-sm border-t" style={{ color: 'var(--muted-foreground)', borderColor: 'var(--border)' }}>
        <p>Last Updated: {overview ? new Date(overview.lastUpdated).toLocaleString() : 'N/A'}</p>
      </footer>
    </div>
  );
}
