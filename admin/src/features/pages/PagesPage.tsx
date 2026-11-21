import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/lib/utils';
import type { ApiResponse, CmsPage } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function PagesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pages', page],
    queryFn: async () =>
      (await api.get<ApiResponse<CmsPage[]>>('/admin/pages', { params: { page, limit: 20 } })).data,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/pages/${id}`),
    onSuccess: () => {
      toast.success('Page deleted');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['pages'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const columns = useMemo<ColumnDef<CmsPage>[]>(
    () => [
      { header: 'Title', accessorKey: 'title' },
      { header: 'Slug', accessorKey: 'slug' },
      { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { header: 'Updated', cell: ({ row }) => formatDate(row.original.updatedAt) },
      {
        header: '',
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/pages/${row.original._id}`)}>
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

  return (
    <div>
      <PageHeader
        title="Pages"
        description="Static CMS pages"
        actions={
          <Link to="/pages/new">
            <Button>
              <Plus className="h-4 w-4" /> Add page
            </Button>
          </Link>
        }
      />
      <Card>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          page={page}
          totalPages={data?.meta?.totalPages || data?.meta?.pages || 1}
          onPageChange={setPage}
          emptyTitle="No pages"
          emptyActionLabel="Add page"
          onEmptyAction={() => navigate('/pages/new')}
        />
      </Card>
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete page?"
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  );
}
