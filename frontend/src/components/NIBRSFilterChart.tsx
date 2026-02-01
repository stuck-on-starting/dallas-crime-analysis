import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../api/client';

interface NIBRSFilterChartProps {
  category?: string;
  groupBy?: 'day' | 'month' | 'year';
}

export function NIBRSFilterChart({
  category = 'all',
  groupBy = 'month',
}: NIBRSFilterChartProps) {
  const [selectedNIBRS, setSelectedNIBRS] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch available NIBRS categories
  const { data: nibrsCategories } = useQuery({
    queryKey: ['nibrsCategories'],
    queryFn: () => api.getNIBRSCategories(),
  });

  // Fetch filtered time series data
  const { data, isLoading, error } = useQuery({
    queryKey: ['filteredData', selectedNIBRS, category, groupBy],
    queryFn: () => api.getFilteredData(selectedNIBRS, category, groupBy),
  });

  const handleToggleNIBRS = (nibrs: string) => {
    setSelectedNIBRS((prev) =>
      prev.includes(nibrs)
        ? prev.filter((n) => n !== nibrs)
        : [...prev, nibrs]
    );
  };

  const filteredCategories = nibrsCategories?.filter((cat) =>
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="loading">
        <span className="loading-text">Loading filtered data...</span>
      </div>
    );
  }

  if (error) {
    return <div className="error">Error loading data: {error.message}</div>;
  }

  return (
    <div className="chart-container">
      <h2>Crime Incidents by Type</h2>

      <div className="nibrs-filter">
        <h3>Filter by Crime Category:</h3>
        <input
          type="text"
          placeholder="Search crime categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <div className="nibrs-list">
          {selectedNIBRS.length > 0 && (
            <div className="selected-tags">
              {selectedNIBRS.map((nibrs) => (
                <span key={nibrs} className="tag">
                  {nibrs}
                  <button onClick={() => handleToggleNIBRS(nibrs)}>×</button>
                </span>
              ))}
              <button
                onClick={() => setSelectedNIBRS([])}
                className="clear-btn"
              >
                Clear All
              </button>
            </div>
          )}

          <div className="category-checkboxes">
            {filteredCategories?.slice(0, 20).map((nibrs) => (
              <label key={nibrs} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedNIBRS.includes(nibrs)}
                  onChange={() => handleToggleNIBRS(nibrs)}
                />
                <span>{nibrs}</span>
              </label>
            ))}
            {filteredCategories && filteredCategories.length > 20 && (
              <p className="more-notice">
                +{filteredCategories.length - 20} more categories (use search)
              </p>
            )}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="inside"
            stroke="#8884d8"
            name="Inside District"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="bordering"
            stroke="#82ca9d"
            name="Bordering District"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="outside"
            stroke="#ffc658"
            name="Outside District"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
