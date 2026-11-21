import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage, idOf } from '@/lib/utils';
import type { ApiResponse, Category } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface FormValues {
  name: string;
  slug?: string;
  parentId?: string;
  image?: string;
  description?: string;
  status: 'active' | 'inactive';
  sortOrder?: number;
}

const empty: FormValues = { name: '', status: 'active', sortOrder: 0 };

export function CategoriesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: empty });

  const listQ = useQuery({
    queryKey: ['categories', page],
    queryFn: async () =>
      (await api.get<ApiResponse<Category[]>>('/admin/categories', { params: { page, limit: 50 } })).data,
  });
  const treeQ = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: async () => (await api.get<ApiResponse<Category[]>>('/admin/categories/tree')).data,
  });

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = { ...values, parentId: values.parentId || null };
      if (editing) return api.patch(`/admin/categories/${editing._id}`, payload);
      return api.post('/admin/categories', payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Category updated' : 'Category created');
      setOpen(false);
      setEditing(null);
      reset(empty);
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => {
      toast.success('Category deleted');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const openCreate = () => {
    setEditing(null);
    reset(empty);
    setOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    reset({
      name: c.name,
      slug: c.slug || '',
      parentId: idOf(c.parentId) || '',
      image: c.image || '',
      description: c.description || '',
      status: c.status || 'active',
      sortOrder: c.sortOrder || 0,
    });
    setOpen(true);
  };

  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
      { header: 'Name', accessorKey: 'name' },
      { header: 'Slug', accessorKey: 'slug' },
      {
        header: 'Parent',
        cell: ({ row }) => idOf(row.original.parentId) || '—',
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

  const flattenTree = (nodes: Category[], depth = 0): { name: string; depth: number }[] =>
    nodes.flatMap((n) => [{ name: n.name, depth }, ...flattenTree(n.children || [], depth + 1)]);

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize products in a category tree"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add category
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <DataTable
            columns={columns}
            data={listQ.data?.data || []}
            loading={listQ.isLoading}
            page={page}
            totalPages={listQ.data?.meta?.totalPages || listQ.data?.meta?.pages || 1}
            onPageChange={setPage}
            emptyTitle="No categories"
            emptyActionLabel="Add category"
            onEmptyAction={openCreate}
          />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tree view</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {flattenTree(treeQ.data?.data || []).map((n, i) => (
              <div key={i} style={{ paddingLeft: n.depth * 12 }} className="text-gray-700">
                {n.name}
              </div>
            ))}
            {!treeQ.isLoading && !(treeQ.data?.data || []).length && (
              <p className="text-gray-500">No tree data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <form
            onSubmit={handleSubmit((v) => save.mutate(v))}
            className="relative w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold">{editing ? 'Edit category' : 'New category'}</h2>
            <div>
              <Label>Name</Label>
              <Input {...register('name', { required: true })} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input {...register('slug')} />
            </div>
            <div>
              <Label>Parent ID</Label>
              <Input {...register('parentId')} placeholder="Optional ObjectId" />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input {...register('image')} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea {...register('description')} />
            </div>
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={save.isPending}>
                Save
              </Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete category?"
        description="Products linked to this category may be affected."
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  );
}
