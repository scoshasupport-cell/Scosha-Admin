import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Ruler } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import type { ApiResponse, SizeChart } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';

export function SizeChartsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [genderFilter, setGenderFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | number | null>(null);

  const listQ = useQuery({
    queryKey: ['size-charts', page, genderFilter, categoryFilter],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SizeChart[]>>('/admin/size-charts', {
        params: {
          page,
          limit: 20,
          gender: genderFilter || undefined,
          category: categoryFilter || undefined,
        },
      });
      return res.data;
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string | number) => api.delete(`/admin/size-charts/${id}`),
    onSuccess: () => {
      toast.success('Size chart deleted');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['size-charts'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const columns = useMemo<ColumnDef<SizeChart>[]>(
    () => [
      {
        header: 'Chart Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-50 text-blue-600 font-semibold text-xs">
              <Ruler className="h-4 w-4" />
            </div>
            <div>
              <span className="font-medium text-gray-900">{row.original.name}</span>
              {row.original.isDefault && (
                <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">
                  Default
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        header: 'Gender',
        cell: ({ row }) => (
          <span className="capitalize font-medium text-gray-700">{row.original.gender}</span>
        ),
      },
      {
        header: 'Category',
        cell: ({ row }) => (
          <span className="capitalize font-medium text-gray-700">{row.original.category}</span>
        ),
      },
      {
        header: 'Brand',
        cell: ({ row }) => (
          <span>{row.original.brand?.name || 'All Brands / Global'}</span>
        ),
      },
      {
        header: 'Sizes',
        cell: ({ row }) => (
          <span className="text-xs text-gray-600">
            {row.original.sizes?.map((s) => s.label).join(', ') || 'No sizes'}
          </span>
        ),
      },
      {
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status || 'active'} />,
      },
      {
        header: '',
        id: 'actions',
        cell: ({ row }) => {
          const chartId = row.original.id || row.original._id;
          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/size-charts/${chartId}/edit`)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => chartId && setDeleteId(chartId)}
              >
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
      <PageHeader
        title="Size Charts"
        description="Manage brand and category size charts, measurement fields, and conversion rules"
        actions={
          <Button onClick={() => navigate('/size-charts/create')}>
            <Plus className="h-4 w-4" /> Add size chart
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
          <div className="w-48">
            <Select
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Genders</option>
              <option value="women">Women</option>
              <option value="men">Men</option>
              <option value="kids">Kids</option>
            </Select>
          </div>
          <div className="w-48">
            <Select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              <option value="tops">Tops & Outerwear</option>
              <option value="bottoms">Bottoms</option>
              <option value="dresses">Dresses</option>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={listQ.data?.data || []}
          loading={listQ.isLoading}
          page={page}
          totalPages={listQ.data?.meta?.totalPages || listQ.data?.meta?.pages || 1}
          onPageChange={setPage}
          emptyTitle="No size charts found"
          emptyActionLabel="Add size chart"
          onEmptyAction={() => navigate('/size-charts/create')}
        />
      </Card>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete size chart?"
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  );
}
