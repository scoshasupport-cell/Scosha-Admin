import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Eye, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/utils';
import type { ApiResponse, Customer } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useDebounce } from '@/hooks/useDebounce';

function customerId(c: Customer) {
  return String(c._id || (c as Customer & { id?: string | number }).id || '');
}

export function CustomersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const debounced = useDebounce(q);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, debounced],
    queryFn: async () =>
      (
        await api.get<ApiResponse<Customer[]>>('/admin/customers', {
          params: { page, limit: 20, q: debounced || undefined },
        })
      ).data,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/customers/${id}`),
    onSuccess: () => {
      toast.success('Customer deleted');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        header: 'Customer',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name || '—'}</p>
            <p className="text-xs text-gray-500">{row.original.email}</p>
          </div>
        ),
      },
      { header: 'Phone', cell: ({ row }) => row.original.phone || '—' },
      {
        header: 'VIP',
        cell: ({ row }) => (row.original.isVip ? 'Yes' : '—'),
      },
      {
        header: 'Orders',
        cell: ({ row }) => row.original.ordersCount ?? '—',
      },
      {
        header: 'Spent',
        cell: ({ row }) => formatCurrency(row.original.totalSpent),
      },
      { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status || 'active'} /> },
      { header: 'Joined', cell: ({ row }) => formatDate(row.original.createdAt) },
      {
        header: '',
        id: 'actions',
        cell: ({ row }) => {
          const id = customerId(row.original);
          return (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/customers/${id}`)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteId(id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          );
        },
      },
    ],
    [navigate]
  );

  return (
    <div>
      <PageHeader title="Customers" description="Registered store customers" />
      <Card>
        <div className="border-b border-gray-100 p-4">
          <Input placeholder="Search customers..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          page={page}
          totalPages={data?.meta?.totalPages || data?.meta?.pages || 1}
          onPageChange={setPage}
          emptyTitle="No customers"
        />
      </Card>
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete customer?"
        description="This permanently removes the customer, their cart, wishlist, addresses, reviews, and orders. This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  );
}
