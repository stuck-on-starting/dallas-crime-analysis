import type { IncidentRecord } from '../api/client';
import '../styles/DataTable.css';

interface DataTableProps {
  records: IncidentRecord[];
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

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

  const getCategoryBadge = (category: string) => {
    const colors: { [key: string]: string } = {
      inside: '#8884d8',
      bordering: '#82ca9d',
      outside: '#ffc658',
    };
    return (
      <span
        className="category-badge"
        style={{ backgroundColor: colors[category] || '#999' }}
      >
        {category}
      </span>
    );
  };

  const renderPagination = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return (
      <div className="pagination">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="page-btn"
        >
          Previous
        </button>

        {pages.map((page, idx) =>
          page === '...' ? (
            <span key={`ellipsis-${idx}`} className="page-ellipsis">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`page-btn ${currentPage === page ? 'active' : ''}`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="page-btn"
        >
          Next
        </button>
      </div>
    );
  };

  if (records.length === 0) {
    return (
      <div className="no-records">
        <p>No records found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="data-table-container">
      <div className="table-info">
        <p>
          Showing {records.length} of {total.toLocaleString()} records (Page{' '}
          {currentPage} of {totalPages})
        </p>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Incident #</th>
              <th>Date</th>
              <th>Category</th>
              <th>Call (911) Problem</th>
              <th>Type of Incident</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td className="incident-number">{record.incident_number}</td>
                <td>{formatDate(record.edate)}</td>
                <td>{getCategoryBadge(record.geo_category)}</td>
                <td className="call-problem">{record.call_signal || 'N/A'}</td>
                <td className="incident-type">{record.offincident || 'N/A'}</td>
                <td className="address">{record.incident_address || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {renderPagination()}
    </div>
  );
}
