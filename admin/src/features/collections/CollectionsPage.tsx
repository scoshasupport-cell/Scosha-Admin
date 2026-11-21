import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import type { ApiResponse, Collection } from '@/types';
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
import { Badge } from '@/components/ui/Badge';

interface FormValues {
  title: string;
  name?: string;
  slug?: string;
  subtitle?: string;
  image?: string;
  productIds?: string;
  featured?: boolean;
  seasonal?: boolean;
  status: 'active' | 'inactive';
  accessLevel: 'draft' | 'vip_early_access' | 'public';
  publicAt?: string;
  sortOrder?: number;
}

const empty: FormValues = {
  title: '',
  status: 'active',
  accessLevel: 'public',
  featured: false,
  seasonal: false,
  sortOrder: 0,
};

export function CollectionsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: empty });

  const listQ = useQuery({
    queryKey: ['collections', page],
    queryFn: async () =>
      (await api.get<ApiResponse<Collection[]>>('/admin/collections', { params: { page, limit: 20 } })).data,
  });

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        publicAt: values.publicAt ? new Date(values.publicAt).toISOString() : null,
        productIds: values.productIds
          ? values.productIds.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      const id = editing?._id || (editing as Collection & { id?: string | number })?.id;
      if (editing) return api.patch(`/admin/collections/${id}`, payload);
      return api.post('/admin/collections', payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Collection updated' : 'Collection created');
      setOpen(false);
      setEditing(null);
      reset(empty);
      qc.invalidateQueries({ queryKey: ['collections'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/collections/${id}`),
    onSuccess: () => {
      toast.success('Collection deleted');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['collections'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const openCreate = () => {
    setEditing(null);
    reset(empty);
    setOpen(true);
  };
  const openEdit = (c: Collection) => {
    setEditing(c);
    reset({
      title: c.title,
      name: c.name || '',
      slug: c.slug || '',
      subtitle: c.subtitle || '',
      image: c.image || '',
      productIds: (c.productIds || []).join(', '),
      featured: !!c.featured,
      seasonal: !!c.seasonal,
      status: c.status || 'active',
      accessLevel: c.accessLevel || 'public',
      publicAt: c.publicAt ? String(c.publicAt).slice(0, 16) : '',
      sortOrder: c.sortOrder || 0,
    });
    setOpen(true);
  };

  const columns = useMemo<ColumnDef<Collection>[]>(
    () => [
      {
        header: 'Collection',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.title}</p>
            <p className="text-xs text-gray-500">{row.original.subtitle}</p>
          </div>
        ),
      },
      {
        header: 'Access',
        cell: ({ row }) => {
          const level = row.original.accessLevel || 'public';
          const label =
            level === 'vip_early_access' ? 'VIP early' : level === 'draft' ? 'Draft' : 'Public';
          return <Badge tone={level === 'vip_early_access' ? 'brand' : 'info'}>{label}</Badge>;
        },
      },
      {
        header: 'Flags',
        cell: ({ row }) => (
          <div className="flex gap-1">
            {row.original.featured && <Badge tone="brand">Featured</Badge>}
            {row.original.seasonal && <Badge tone="info">Seasonal</Badge>}
          </div>
        ),
      },
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
        title="Collections"
        description="Curated product groupings"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add collection
          </Button>
        }
      />
      <Card>
        <DataTable
          columns={columns}
          data={listQ.data?.data || []}
          loading={listQ.isLoading}
          page={page}
          totalPages={listQ.data?.meta?.totalPages || listQ.data?.meta?.pages || 1}
          onPageChange={setPage}
          emptyTitle="No collections"
          emptyActionLabel="Add collection"
          onEmptyAction={openCreate}
        />
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="relative max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">{editing ? 'Edit collection' : 'New collection'}</h2>
            <div><Label>Title</Label><Input {...register('title', { required: true })} /></div>
            <div><Label>Name</Label><Input {...register('name')} /></div>
            <div><Label>Slug</Label><Input {...register('slug')} /></div>
            <div><Label>Subtitle</Label><Input {...register('subtitle')} /></div>
            <div><Label>Image URL</Label><Input {...register('image')} /></div>
            <div><Label>Product IDs (comma separated)</Label><Textarea {...register('productIds')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select {...register('status')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>
              <div>
                <Label>Visibility</Label>
                <Select {...register('accessLevel')}>
                  <option value="draft">Draft (admin only)</option>
                  <option value="vip_early_access">VIP Early Access</option>
                  <option value="public">Public</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Auto-publish to public at</Label>
                <Input type="datetime-local" {...register('publicAt')} />
              </div>
              <div>
                <Label>Sort order</Label>
                <Input type="number" {...register('sortOrder', { valueAsNumber: true })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('featured')} /> Featured
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('seasonal')} /> Seasonal
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={save.isPending}>Save</Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete collection?"
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  );
}
