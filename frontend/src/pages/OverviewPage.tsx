import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import '../styles/Pages.css';

export function OverviewPage() {
  const { data: overview, isLoading, error } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api.getOverview(),
  });

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="loading">
          <span className="loading-text">Loading overview statistics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error">
          Error loading data: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
        <Link to="/" className="back-link">← Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Link to="/" className="back-link">← Back to Home</Link>
        <h1>Overview Statistics</h1>
        <p>Summary of all crime data in the system</p>
      </div>

      <section className="overview-stats">
        <div className="stat-card">
          <h3>Total Records</h3>
          <p className="stat-value">{overview?.totalRecords.toLocaleString()}</p>
        </div>

        <div className="stat-card">
          <h3>Inside District</h3>
          <p className="stat-value">
            {overview?.categoryDistribution.inside.toLocaleString()}
          </p>
          <p className="stat-percent">
            {overview &&
              ((overview.categoryDistribution.inside / overview.totalRecords) * 100).toFixed(2)
            }%
          </p>
        </div>

        <div className="stat-card">
          <h3>Bordering District</h3>
          <p className="stat-value">
            {overview?.categoryDistribution.bordering.toLocaleString()}
          </p>
          <p className="stat-percent">
            {overview &&
              ((overview.categoryDistribution.bordering / overview.totalRecords) * 100).toFixed(2)
            }%
          </p>
        </div>

        <div className="stat-card">
          <h3>Outside District</h3>
          <p className="stat-value">
            {overview?.categoryDistribution.outside.toLocaleString()}
          </p>
          <p className="stat-percent">
            {overview &&
              ((overview.categoryDistribution.outside / overview.totalRecords) * 100).toFixed(2)
            }%
          </p>
        </div>

        <div className="stat-card">
          <h3>Date Range</h3>
          <p className="stat-value-small">
            {overview && new Date(overview.dateRange.earliest).getFullYear()} -{' '}
            {overview && new Date(overview.dateRange.latest).getFullYear()}
          </p>
        </div>

        <div className="stat-card">
          <h3>Crime Categories</h3>
          <p className="stat-value">{overview?.nibrsCategories}</p>
        </div>
      </section>

      <footer className="page-footer">
        <p>
          Last Updated:{' '}
          {overview ? new Date(overview.lastUpdated).toLocaleString() : 'N/A'}
        </p>
      </footer>
    </div>
  );
}
