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
          <Tooltip itemSorter={(item) => item.dataKey === 'inside' ? 0 : 1} />
          <Legend content={({ payload }) => {
            if (!payload) return null;
            const sorted = [...payload].sort((a, _b) => (a.dataKey === 'inside' ? -1 : 1));
            return (
              <ul className="flex justify-center gap-6 mt-2 text-sm list-none p-0">
                {sorted.map((entry) => (
                  <li key={entry.dataKey as string} className="flex items-center gap-1.5">
                    <span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: entry.color, borderRadius: 2 }} />
                    {entry.value}
                  </li>
                ))}
              </ul>
            );
          }} />
          <Bar dataKey="inside" fill="#1e3a5f" name="Inside Prestonwood PID" />
          <Bar dataKey="bordering" fill="#60a5fa" name="Bordering District" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
