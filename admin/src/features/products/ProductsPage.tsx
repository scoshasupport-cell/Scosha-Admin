import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/utils';
import type { ApiResponse, Product } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { useDebounce } from '@/hooks/useDebounce';

export function ProductsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const debounced = useDebounce(q);

  const parentCategories = [
    { slug: 'clothes', name: 'Clothes' },
    { slug: 'furniture', name: 'Furniture' },
    { slug: 'skincare', name: 'Skincare' },
    { slug: 'electronics', name: 'Electronics' },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, debounced, status, category],
    queryFn: async () =>
      (
        await api.get<ApiResponse<Product[]>>('/admin/products', {
          params: {
            page,
            limit: 20,
            search: debounced || undefined,
            status: status || undefined,
            category: category || undefined,
          },
        })
      ).data,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/products/${id}`),
    onSuccess: () => {
      toast.success('Product deleted');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        header: 'Product',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.original.images?.[0] ? (
              <img src={row.original.images[0]} alt="" className="h-10 w-10 rounded object-cover" />
            ) : (
              <div className="h-10 w-10 rounded bg-gray-100" />
            )}
            <div>
              <p className="font-medium text-gray-900">{row.original.name}</p>
              <p className="text-xs text-gray-500">{row.original.slug}</p>
            </div>
          </div>
        ),
      },
      {
        header: 'Price',
        cell: ({ row }) => formatCurrency(row.original.basePrice),
      },
      {
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        header: 'Updated',
        cell: ({ row }) => formatDate(row.original.updatedAt || row.original.createdAt),
      },
      {
        header: '',
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/products/${row.original._id}`)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.original._id)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    [navigate]
  );

  const meta = data?.meta;
  const totalPages = meta?.totalPages || meta?.pages || 1;

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage catalog products and variants"
        actions={
          <Link to="/products/new">
            <Button>
              <Plus className="h-4 w-4" /> Add product
            </Button>
          </Link>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row">
          <Input placeholder="Search products..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="sm:w-44">
            <option value="">All categories</option>
            {parentCategories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="sm:w-44">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyTitle="No products"
          emptyActionLabel="Add product"
          onEmptyAction={() => navigate('/products/new')}
        />
      </Card>
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete product?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  );
}
