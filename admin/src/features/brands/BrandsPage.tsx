import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import type { ApiResponse, Brand } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';

interface FormValues {
  name: string;
  slug?: string;
  logo?: string;
  banner?: string;
  description?: string;
  status: 'active' | 'inactive';
  sortOrder?: number;
}

const empty: FormValues = { name: '', status: 'active', sortOrder: 0 };

export function BrandsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Brand | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: empty });

  const listQ = useQuery({
    queryKey: ['brands', page, q],
    queryFn: async () =>
      (await api.get<ApiResponse<Brand[]>>('/admin/brands', { params: { page, limit: 20, q: q || undefined } })).data,
  });

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editing) return api.patch(`/admin/brands/${editing._id}`, values);
      return api.post('/admin/brands', values);
    },
    onSuccess: () => {
      toast.success(editing ? 'Brand updated' : 'Brand created');
      setOpen(false);
      setEditing(null);
      reset(empty);
      qc.invalidateQueries({ queryKey: ['brands'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/brands/${id}`),
    onSuccess: () => {
      toast.success('Brand deleted');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['brands'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const openCreate = () => {
    setEditing(null);
    reset(empty);
    setOpen(true);
  };
  const openEdit = (b: Brand) => {
    setEditing(b);
    reset({
      name: b.name,
      slug: b.slug || '',
      logo: b.logo || '',
      banner: b.banner || '',
      description: b.description || '',
      status: b.status || 'active',
      sortOrder: b.sortOrder || 0,
    });
    setOpen(true);
  };

  const columns = useMemo<ColumnDef<Brand>[]>(
    () => [
      {
        header: 'Brand',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.original.logo ? (
              <img src={row.original.logo} alt="" className="h-8 w-8 rounded object-contain" />
            ) : (
              <div className="h-8 w-8 rounded bg-gray-100" />
            )}
            <span className="font-medium">{row.original.name}</span>
          </div>
        ),
      },
      { header: 'Slug', accessorKey: 'slug' },
      { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        header: '',
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.original._id)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Brands"
        description="Manage product brands"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add brand
          </Button>
        }
      />
      <Card>
        <div className="border-b border-gray-100 p-4">
          <Input placeholder="Search brands..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <DataTable
          columns={columns}
          data={listQ.data?.data || []}
          loading={listQ.isLoading}
          page={page}
          totalPages={listQ.data?.meta?.totalPages || listQ.data?.meta?.pages || 1}
          onPageChange={setPage}
          emptyTitle="No brands"
          emptyActionLabel="Add brand"
          onEmptyAction={openCreate}
        />
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="relative w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">{editing ? 'Edit brand' : 'New brand'}</h2>
            <div><Label>Name</Label><Input {...register('name', { required: true })} /></div>
            <div><Label>Slug</Label><Input {...register('slug')} /></div>
            <div><Label>Logo URL</Label><Input {...register('logo')} /></div>
            <div><Label>Banner URL</Label><Input {...register('banner')} /></div>
            <div><Label>Description</Label><Textarea {...register('description')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select {...register('status')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>
              <div>
                <Label>Sort order</Label>
                <Input type="number" {...register('sortOrder', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={save.isPending}>Save</Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete brand?"
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  );
}
