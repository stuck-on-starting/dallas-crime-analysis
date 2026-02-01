import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../api/client';

interface YearlyBarChartProps {
  category?: string;
}

export function YearlyBarChart({ category = 'all' }: YearlyBarChartProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['yearly', category],
    queryFn: () => api.getYearlyData(category),
  });

  if (isLoading) {
    return (
      <div className="loading">
        <span className="loading-text">Loading yearly data...</span>
      </div>
    );
  }

  if (error) {
    return <div className="error">Error loading data: {error.message}</div>;
  }

  return (
    <div className="chart-container">
      <h2>Crime Incidents by Year</h2>
      <ResponsiveContainer width="100%" height={600}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="inside" fill="#8884d8" name="Inside District" />
          <Bar dataKey="bordering" fill="#82ca9d" name="Bordering District" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
