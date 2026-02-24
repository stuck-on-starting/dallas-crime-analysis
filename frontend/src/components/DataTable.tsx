import type { IncidentRecord } from '../api/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DataTableProps {
  records: IncidentRecord[];
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

const categoryClasses: Record<string, string> = {
  inside: 'bg-purple-500 hover:bg-purple-500 text-white',
  bordering: 'bg-green-500 hover:bg-green-500 text-white',
  outside: 'bg-orange-400 hover:bg-orange-400 text-white',
};

export function DataTable({
  records,
  currentPage,
  totalPages,
  total,
  onPageChange,
}: DataTableProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const renderPagination = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return (
      <div className="flex justify-center items-center gap-2 mt-6 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>

        {pages.map((page, idx) =>
          page === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              ...
            </span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page as number)}
            >
              {page}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    );
  };

  if (records.length === 0) {
    return (
      <div className="py-16 text-center rounded-lg bg-card">
        <p className="text-lg" style={{ color: 'var(--muted-foreground)' }}>
          No records found matching your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
        Showing {records.length} of {total.toLocaleString()} records (Page {currentPage} of {totalPages})
      </p>

      <ScrollArea className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow style={{ backgroundColor: 'var(--primary)' }}>
              <TableHead className="text-primary-foreground font-semibold uppercase text-xs tracking-wide">Incident #</TableHead>
              <TableHead className="text-primary-foreground font-semibold uppercase text-xs tracking-wide">Date</TableHead>
              <TableHead className="text-primary-foreground font-semibold uppercase text-xs tracking-wide">Category</TableHead>
              <TableHead className="text-primary-foreground font-semibold uppercase text-xs tracking-wide">Call (911) Problem</TableHead>
              <TableHead className="text-primary-foreground font-semibold uppercase text-xs tracking-wide">Type of Incident</TableHead>
              <TableHead className="text-primary-foreground font-semibold uppercase text-xs tracking-wide">Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-mono font-medium text-sm" style={{ color: 'var(--accent)' }}>
                  {record.incident_number}
                </TableCell>
                <TableCell>{formatDate(record.edate)}</TableCell>
                <TableCell>
                  <Badge className={categoryClasses[record.geo_category] ?? 'bg-gray-500 text-white'}>
                    {record.geo_category}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{record.call_signal || 'N/A'}</TableCell>
                <TableCell className="max-w-[250px] truncate">{record.offincident || 'N/A'}</TableCell>
                <TableCell className="max-w-[300px] truncate">{record.incident_address || 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      {renderPagination()}
    </div>
  );
}
