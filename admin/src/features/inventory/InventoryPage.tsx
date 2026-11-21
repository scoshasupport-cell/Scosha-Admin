import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { idOf } from '@/lib/utils';
import type { ApiResponse, Variant } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

type AvailabilityFilter = 'low' | 'all' | 'in_stock' | 'out_of_stock';

export function InventoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [threshold, setThreshold] = useState(10);
  const [availability, setAvailability] = useState<AvailabilityFilter>('low');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', page, threshold, availability],
    queryFn: async () =>
      (
        await api.get<ApiResponse<Variant[]>>('/admin/inventory', {
          params: { page, limit: 30, threshold, availability },
        })
      ).data,
  });

  const setStock = useMutation({
    mutationFn: async ({ variantId, stock }: { variantId: string; stock: number }) =>
      api.patch(`/admin/inventory/${variantId}/stock`, { stock }),
    onSuccess: () => {
      toast.success('Stock updated');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update stock'),
  });

  const adjustStock = useMutation({
    mutationFn: async ({ variantId, delta }: { variantId: string; delta: number }) =>
      api.post(`/admin/inventory/${variantId}/adjust`, { delta }),
    onSuccess: () => {
      toast.success('Stock adjusted');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not adjust stock'),
  });

  const columns = useMemo<ColumnDef<Variant>[]>(
    () => [
      {
        header: 'Product',
        cell: ({ row }) => {
          const p = row.original.product || row.original.productId;
          if (p && typeof p === 'object') return p.name || '—';
          return idOf(row.original.productId) || '—';
        },
      },
      {
        header: 'Variant',
        cell: ({ row }) => `${row.original.color?.name || '—'} / ${row.original.size || '—'}`,
      },
      { header: 'SKU', cell: ({ row }) => row.original.sku || '—' },
      {
        header: 'Availability',
        cell: ({ row }) => {
          const stock = row.original.stock ?? 0;
          return (
            <StatusBadge status={stock > 0 ? 'in_stock' : 'out_of_stock'} />
          );
        },
      },
      {
        header: 'Stock',
        cell: ({ row }) => {
          const id = String(row.original._id || row.original.id);
          const current = row.original.stock ?? 0;
          const draft = drafts[id] ?? String(current);
          return (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                className="w-24"
                value={draft}
                onChange={(e) => setDrafts((d) => ({ ...d, [id]: e.target.value }))}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={setStock.isPending || Number(draft) === current}
                onClick={() =>
                  setStock.mutate({ variantId: id, stock: Math.max(0, Math.floor(Number(draft) || 0)) })
                }
              >
                Set
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={adjustStock.isPending}
                onClick={() => adjustStock.mutate({ variantId: id, delta: 1 })}
              >
                +1
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={adjustStock.isPending || current <= 0}
                onClick={() => adjustStock.mutate({ variantId: id, delta: -1 })}
              >
                −1
              </Button>
            </div>
          );
        },
      },
      { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    ],
    [threshold, drafts, setStock.isPending, adjustStock.isPending]
  );

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="View and restock variants. Availability is derived from stock automatically."
      />
      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-gray-100 p-4">
          <div>
            <Label>Filter</Label>
            <Select
              value={availability}
              onChange={(e) => {
                setAvailability(e.target.value as AvailabilityFilter);
                setPage(1);
              }}
            >
              <option value="low">Low stock</option>
              <option value="out_of_stock">Out of stock</option>
              <option value="in_stock">In stock</option>
              <option value="all">All variants</option>
            </Select>
          </div>
          <div>
            <Label>Low-stock threshold</Label>
            <Input
              type="number"
              className="w-32"
              value={threshold}
              onChange={(e) => {
                setThreshold(Number(e.target.value) || 0);
                setPage(1);
              }}
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          page={page}
          totalPages={data?.meta?.totalPages || data?.meta?.pages || 1}
          onPageChange={setPage}
          emptyTitle="No inventory rows"
          emptyDescription="Nothing matches the selected inventory filter."
        />
      </Card>
    </div>
  );
}
