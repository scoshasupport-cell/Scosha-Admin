import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { ApiResponse, Order, OrderStatus } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { useDebounce } from '@/hooks/useDebounce';

const statuses: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

export function OrdersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const debounced = useDebounce(q);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, debounced, status],
    queryFn: async () =>
      (
        await api.get<ApiResponse<Order[]>>('/admin/orders', {
          params: { page, limit: 20, q: debounced || undefined, status: status || undefined },
        })
      ).data,
  });

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        header: 'Order',
        cell: ({ row }) => (
          <Link to={`/orders/${row.original._id}`} className="font-medium text-brand hover:underline">
            {row.original.orderNumber || row.original._id.slice(-8)}
          </Link>
        ),
      },
      {
        header: 'Customer',
        cell: ({ row }) => {
          const u = typeof row.original.user === 'object' ? row.original.user : null;
          return u?.email || u?.name || '—';
        },
      },
      {
        header: 'Total',
        cell: ({ row }) => formatCurrency(row.original.total),
      },
      {
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        header: 'Date',
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        header: '',
        id: 'actions',
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => navigate(`/orders/${row.original._id}`)}>
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [navigate]
  );

  return (
    <div>
      <PageHeader title="Orders" description="Fulfill and track customer orders" />
      <Card>
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row">
          <Input
            placeholder="Search orders..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="sm:w-48"
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          page={page}
          totalPages={data?.meta?.totalPages || data?.meta?.pages || 1}
          onPageChange={setPage}
          emptyTitle="No orders found"
        />
      </Card>
    </div>
  );
}
