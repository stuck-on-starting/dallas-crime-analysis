import { useQuery } from '@tanstack/react-query';
import { TimeSeriesChart } from '../components/TimeSeriesChart';
import { YearlyBarChart } from '../components/YearlyBarChart';
import { NIBRSFilterChart } from '../components/NIBRSFilterChart';
import { CrimeMap } from '../components/CrimeMap';
import { api } from '../api/client';

export function Dashboard() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api.getOverview(),
  });

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Dallas Crime Data Analysis</h1>
        <p>Prestonwood District Crime Analysis System</p>
      </header>

      {/* Overview Stats */}
      <section className="overview-stats">
        {isLoading ? (
          <div className="loading">Loading overview...</div>
        ) : overview ? (
          <>
            <div className="stat-card">
              <h3>Total Records</h3>
              <p className="stat-value">{overview.totalRecords.toLocaleString()}</p>
            </div>
            <div className="stat-card">
              <h3>Inside District</h3>
              <p className="stat-value">
                {overview.categoryDistribution.inside.toLocaleString()}
              </p>
              <p className="stat-percent">
                {((overview.categoryDistribution.inside / overview.totalRecords) * 100).toFixed(2)}%
              </p>
            </div>
            <div className="stat-card">
              <h3>Bordering District</h3>
              <p className="stat-value">
                {overview.categoryDistribution.bordering.toLocaleString()}
              </p>
              <p className="stat-percent">
                {((overview.categoryDistribution.bordering / overview.totalRecords) * 100).toFixed(2)}%
              </p>
            </div>
            <div className="stat-card">
              <h3>Outside District</h3>
              <p className="stat-value">
                {overview.categoryDistribution.outside.toLocaleString()}
              </p>
              <p className="stat-percent">
                {((overview.categoryDistribution.outside / overview.totalRecords) * 100).toFixed(2)}%
              </p>
            </div>
            <div className="stat-card">
              <h3>Date Range</h3>
              <p className="stat-value-small">
                {new Date(overview.dateRange.earliest).getFullYear()} -{' '}
                {new Date(overview.dateRange.latest).getFullYear()}
              </p>
            </div>
            <div className="stat-card">
              <h3>Crime Categories</h3>
              <p className="stat-value">{overview.nibrsCategories}</p>
            </div>
          </>
        ) : null}
      </section>

      {/* Interactive Map */}
      <section className="visualization-section">
        <CrimeMap />
      </section>

      {/* Time Series Chart */}
      <section className="visualization-section">
        <TimeSeriesChart groupBy="month" />
      </section>

      {/* Yearly Bar Chart */}
      <section className="visualization-section">
        <YearlyBarChart />
      </section>

      {/* NIBRS Filtered Chart */}
      <section className="visualization-section">
        <NIBRSFilterChart groupBy="month" />
      </section>

      <footer className="dashboard-footer">
        <p>
          Data Source: Dallas Police Department | Last Updated:{' '}
          {overview ? new Date(overview.lastUpdated).toLocaleString() : 'Loading...'}
        </p>
      </footer>
    </div>
  );
}
