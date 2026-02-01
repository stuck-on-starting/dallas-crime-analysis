import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { RecordsFilters } from '../api/client';
import { DataTable } from '../components/DataTable';
import '../styles/Pages.css';
import '../styles/RecordsPage.css';

export function RecordsPage() {
  // Track whether user has initiated a search
  const [hasSearched, setHasSearched] = useState(false);

  // Form state (what user is editing)
  const [formFilters, setFormFilters] = useState<RecordsFilters>({
    page: 1,
    limit: 50,
    category: 'all',
    nibrs: 'all',
    startDate: '',
    endDate: '',
    search: '',
  });

  // Applied filters (what's sent to API)
  const [appliedFilters, setAppliedFilters] = useState<RecordsFilters>({
    page: 1,
    limit: 50,
    category: 'all',
    nibrs: 'all',
    startDate: '',
    endDate: '',
    search: '',
  });

  const { data: nibrsCategories } = useQuery({
    queryKey: ['nibrsCategories'],
    queryFn: () => api.getNIBRSCategories(),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['records', appliedFilters],
    queryFn: () => api.getRecords(appliedFilters),
    enabled: hasSearched, // Only fetch after user clicks Search
  });

  const handleFormChange = (key: keyof RecordsFilters, value: any) => {
    setFormFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSearch = () => {
    setHasSearched(true);
    setAppliedFilters({
      ...formFilters,
      page: 1, // Reset to page 1 when searching
    });
  };

  const handlePageChange = (page: number) => {
    const newFilters = { ...appliedFilters, page };
    setAppliedFilters(newFilters);
    setFormFilters(newFilters);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    const defaultFilters = {
      page: 1,
      limit: 50,
      category: 'all',
      nibrs: 'all',
      startDate: '',
      endDate: '',
      search: '',
    };
    setFormFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setHasSearched(false); // Don't reload data after clearing
  };

  const hasActiveFilters =
    appliedFilters.category !== 'all' ||
    appliedFilters.nibrs !== 'all' ||
    appliedFilters.startDate ||
    appliedFilters.endDate ||
    appliedFilters.search;

  return (
    <div className="page-container">
      <div className="page-header">
        <Link to="/" className="back-link">
          ← Back to Home
        </Link>
        <h1>Data Records</h1>
        <p>Browse and filter crime incident records</p>
      </div>

      <section className="visualization-section">
        <div className="filters-section">
          <h3>Filters</h3>

          <div className="filters-grid">
            {/* Search */}
            <div className="filter-group full-width">
              <label>Search by Incident # or Address</label>
              <input
                type="text"
                placeholder="Search..."
                value={formFilters.search || ''}
                onChange={(e) => handleFormChange('search', e.target.value)}
                className="filter-input"
              />
            </div>

            {/* Category Filter */}
            <div className="filter-group">
              <label>Category</label>
              <select
                value={formFilters.category || 'all'}
                onChange={(e) => handleFormChange('category', e.target.value)}
                className="filter-select"
              >
                <option value="all">All Categories</option>
                <option value="inside">Inside District</option>
                <option value="bordering">Bordering District</option>
                <option value="outside">Outside District</option>
              </select>
            </div>

            {/* NIBRS Crime Type Filter */}
            <div className="filter-group">
              <label>Crime Type</label>
              <select
                value={formFilters.nibrs || 'all'}
                onChange={(e) => handleFormChange('nibrs', e.target.value)}
                className="filter-select"
              >
                <option value="all">All Crime Types</option>
                {nibrsCategories?.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="filter-group">
              <label>Start Date</label>
              <input
                type="date"
                value={formFilters.startDate || ''}
                onChange={(e) => handleFormChange('startDate', e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>End Date</label>
              <input
                type="date"
                value={formFilters.endDate || ''}
                onChange={(e) => handleFormChange('endDate', e.target.value)}
                className="filter-input"
              />
            </div>

            {/* Records Per Page */}
            <div className="filter-group">
              <label>Records Per Page</label>
              <select
                value={formFilters.limit || 50}
                onChange={(e) =>
                  handleFormChange('limit', Number(e.target.value))
                }
                className="filter-select"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="filter-actions">
            <button onClick={handleSearch} className="search-btn">
              Search
            </button>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="clear-filters-btn">
                Clear All Filters
              </button>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="loading">
            <span className="loading-text">Loading records...</span>
          </div>
        )}

        {error && (
          <div className="error">
            Error loading records:{' '}
            {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        )}

        {data && (
          <DataTable
            records={data.records}
            currentPage={data.pagination.page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            onPageChange={handlePageChange}
          />
        )}
      </section>
    </div>
  );
}
