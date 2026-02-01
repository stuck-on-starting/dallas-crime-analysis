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

interface TimeSeriesChartProps {
  category?: string;
  groupBy?: 'day' | 'month' | 'year';
}

export function TimeSeriesChart({
  category = 'all',
  groupBy = 'month',
}: TimeSeriesChartProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['timeSeries', category, groupBy],
    queryFn: () => api.getTimeSeries(category, groupBy),
  });

  if (isLoading) {
    return (
      <div className="loading">
        <span className="loading-text">Loading time series data...</span>
      </div>
    );
  }

  if (error) {
    return <div className="error">Error loading data: {error.message}</div>;
  }

  return (
    <div className="chart-container">
      <h2>Crime Incidents Over Time</h2>
      <div className="chart-controls">
        <span>Grouped by: {groupBy}</span>
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
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
