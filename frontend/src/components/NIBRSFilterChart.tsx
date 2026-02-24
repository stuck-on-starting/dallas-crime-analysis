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
import { XIcon } from 'lucide-react';
import { api } from '../api/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  const { data: nibrsCategories } = useQuery({
    queryKey: ['nibrsCategories'],
    queryFn: () => api.getNIBRSCategories(),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['filteredData', selectedNIBRS, category, groupBy],
    queryFn: () => api.getFilteredData(selectedNIBRS, category, groupBy),
  });

  const handleToggleNIBRS = (nibrs: string) => {
    setSelectedNIBRS((prev) =>
      prev.includes(nibrs) ? prev.filter((n) => n !== nibrs) : [...prev, nibrs]
    );
  };

  const filteredCategories = nibrsCategories?.filter((cat) =>
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--muted)', borderTopColor: 'var(--accent)' }} />
        <span className="ml-4" style={{ color: 'var(--muted-foreground)' }}>Loading filtered data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-md" style={{ color: 'var(--destructive)', background: 'oklch(0.95 0.05 27)' }}>
        Error loading data: {error.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
        Crime Incidents by Type
      </h2>

      {/* Filter panel */}
      <div className="p-4 rounded-lg" style={{ background: 'var(--muted)' }}>
        <h3 className="font-medium mb-3" style={{ color: 'var(--foreground)' }}>
          Filter by Crime Category:
        </h3>

        <Input
          placeholder="Search crime categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-3"
        />

        {/* Selected tags */}
        {selectedNIBRS.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 p-2 bg-card rounded-md">
            {selectedNIBRS.map((nibrs) => (
              <Badge key={nibrs} className="flex items-center gap-1 bg-primary text-primary-foreground">
                {nibrs}
                <button
                  onClick={() => handleToggleNIBRS(nibrs)}
                  className="ml-1 hover:opacity-70"
                  aria-label={`Remove ${nibrs}`}
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            ))}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setSelectedNIBRS([])}
            >
              Clear All
            </Button>
          </div>
        )}

        {/* Checkbox list */}
        <ScrollArea className="h-64 rounded-md border bg-card p-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {filteredCategories?.slice(0, 20).map((nibrs) => (
              <div key={nibrs} className="flex items-center gap-2 px-2 py-1">
                <Checkbox
                  id={`nibrs-${nibrs}`}
                  checked={selectedNIBRS.includes(nibrs)}
                  onCheckedChange={(checked) => {
                    if (checked === true || checked === false) {
                      handleToggleNIBRS(nibrs);
                    }
                  }}
                />
                <Label htmlFor={`nibrs-${nibrs}`} className="text-sm cursor-pointer">
                  {nibrs}
                </Label>
              </div>
            ))}
            {filteredCategories && filteredCategories.length > 20 && (
              <p className="col-span-2 text-sm px-2 py-1" style={{ color: 'var(--muted-foreground)' }}>
                +{filteredCategories.length - 20} more categories (use search)
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chart */}
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
