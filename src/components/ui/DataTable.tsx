import type { ReactNode } from 'react';
import {
  Card,
  Pagination,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from 'react-typescript-ui';
import { ArrowDown, ArrowUp } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** When set, the header becomes a sort button for this key. */
  sortKey?: string;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  /** Shown instead of the table when there are no rows. */
  empty: ReactNode;
  onRowClick?: (row: T) => void;
  /** Stacked card used below the md breakpoint instead of a table row. */
  renderMobile: (row: T) => ReactNode;
  /** Optional toolbar (search, filters) shown above the table. */
  toolbar?: ReactNode;
  footer?: ReactNode;
  sort?: { key: string; order: 'asc' | 'desc' };
  onSort?: (key: string) => void;
}

/**
 * Shared table (style guide section 9.3) on react-typescript-ui's Table:
 * toolbar, sentence-case muted header, 52px rows with hover, skeleton rows
 * while loading, an empty state, and stacked cards on mobile.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty,
  onRowClick,
  renderMobile,
  toolbar,
  footer,
  sort,
  onSort,
}: DataTableProps<T>) {
  return (
    <Card className="card-flush shadow-xs overflow-hidden">
      {toolbar && <div className="p-4 border-b border-border">{toolbar}</div>}

      {loading ? (
        <div className="p-4 space-y-3" aria-busy="true" aria-label="Loading">
          {[0, 1, 2, 3, 4].map(i => (
            <Skeleton key={i} variant="rect" height={40} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-4">{empty}</div>
      ) : (
        <>
          <div className="hidden md:block data-table">
            <Table size="sm" hoverable>
              <TableHead>
                <TableRow>
                  {columns.map(col => {
                    const active = sort && col.sortKey && sort.key === col.sortKey;
                    return (
                      <TableHeaderCell
                        key={col.key}
                        className={col.className}
                        aria-sort={active ? (sort.order === 'asc' ? 'ascending' : 'descending') : undefined}
                      >
                        {col.sortKey && onSort ? (
                          <button
                            type="button"
                            onClick={() => onSort(col.sortKey!)}
                            className="focus-ring inline-flex items-center gap-1 rounded-sm hover:text-text"
                          >
                            {col.header}
                            {active &&
                              (sort.order === 'asc' ? (
                                <ArrowUp size={12} aria-hidden="true" />
                              ) : (
                                <ArrowDown size={12} aria-hidden="true" />
                              ))}
                          </button>
                        ) : (
                          col.header
                        )}
                      </TableHeaderCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(row => (
                  <TableRow
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={onRowClick ? 'cursor-pointer group' : 'group'}
                  >
                    {columns.map(col => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="md:hidden divide-y divide-border">
            {rows.map(row => (
              <li key={rowKey(row)}>{renderMobile(row)}</li>
            ))}
          </ul>
        </>
      )}

      {footer && !loading && rows.length > 0 && (
        <div className="px-4 py-3 border-t border-border">{footer}</div>
      )}
    </Card>
  );
}

interface TablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  noun: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

/** "Showing 1–10 of 124 patients" + rows-per-page + page buttons. */
export function TablePagination({ page, pageSize, total, noun, onPageChange, onPageSizeChange }: TablePaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[13px] text-muted">
      <span className="tabular-nums">
        Showing {from}–{to} of {total} {noun}
      </span>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2">
          <span>Rows per page</span>
          <Select
            size="sm"
            value={String(pageSize)}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            options={[
              { label: '10', value: '10' },
              { label: '25', value: '25' },
              { label: '50', value: '50' },
            ]}
            aria-label="Rows per page"
          />
        </label>
        {pages > 1 && <Pagination page={page} count={pages} onChange={onPageChange} size="sm" />}
      </div>
    </div>
  );
}

export default DataTable;
