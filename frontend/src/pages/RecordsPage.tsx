import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { RecordsFilters } from '../api/client';
import { DataTable } from '../components/DataTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function RecordsPage() {
  const [hasSearched, setHasSearched] = useState(false);

  const [formFilters, setFormFilters] = useState<RecordsFilters>({
    page: 1,
    limit: 50,
    category: 'all',
    nibrs: 'all',
    startDate: '',
    endDate: '',
    search: '',
  });

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
    enabled: hasSearched,
  });

  const handleSearch = () => {
    setHasSearched(true);
    setAppliedFilters({ ...formFilters, page: 1 });
  };

  const handlePageChange = (page: number) => {
    const newFilters = { ...appliedFilters, page };
    setAppliedFilters(newFilters);
    setFormFilters(newFilters);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    const defaultFilters: RecordsFilters = {
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
    setHasSearched(false);
  };

  const hasActiveFilters =
    appliedFilters.category !== 'all' ||
    appliedFilters.nibrs !== 'all' ||
    appliedFilters.startDate ||
    appliedFilters.endDate ||
    appliedFilters.search;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>Data Records</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>Browse and filter crime incident records</p>
      </div>

      {/* Filters */}
      <div className="p-6 rounded-lg" style={{ background: 'var(--muted)' }}>
        <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: 'var(--foreground)' }}>Filters</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Search — full width */}
          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
            <Label>Search by Incident # or Address</Label>
            <Input
              placeholder="Search..."
              value={formFilters.search || ''}
              onChange={(e) => setFormFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select
              value={formFilters.category || 'all'}
              onValueChange={(v) => setFormFilters((prev) => ({ ...prev, category: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="inside">Inside District</SelectItem>
                <SelectItem value="bordering">Bordering District</SelectItem>
                <SelectItem value="outside">Outside District</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Crime Type */}
          <div className="flex flex-col gap-1.5">
            <Label>Crime Type</Label>
            <Select
              value={(typeof formFilters.nibrs === 'string' ? formFilters.nibrs : undefined) ?? 'all'}
              onValueChange={(v) => setFormFilters((prev) => ({ ...prev, nibrs: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Crime Types</SelectItem>
                {nibrsCategories?.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Records per page */}
          <div className="flex flex-col gap-1.5">
            <Label>Records Per Page</Label>
            <Select
              value={String(formFilters.limit ?? 50)}
              onValueChange={(v) => setFormFilters((prev) => ({ ...prev, limit: Number(v) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start date */}
          <div className="flex flex-col gap-1.5">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={formFilters.startDate || ''}
              onChange={(e) => setFormFilters((prev) => ({ ...prev, startDate: e.target.value }))}
              style={{ colorScheme: 'light' }}
            />
          </div>

          {/* End date */}
          <div className="flex flex-col gap-1.5">
            <Label>End Date</Label>
            <Input
              type="date"
              value={formFilters.endDate || ''}
              onChange={(e) => setFormFilters((prev) => ({ ...prev, endDate: e.target.value }))}
              style={{ colorScheme: 'light' }}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <Button onClick={handleSearch}>Search</Button>
          {hasActiveFilters && (
            <Button variant="destructive" onClick={clearFilters}>
              Clear All Filters
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--muted)', borderTopColor: 'var(--accent)' }} />
          <span className="ml-4" style={{ color: 'var(--muted-foreground)' }}>Loading records...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-md" style={{ color: 'var(--destructive)', background: 'oklch(0.95 0.05 27)' }}>
          Error loading records: {error instanceof Error ? error.message : 'Unknown error'}
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
    </div>
  );
}
