import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import type { ApiResponse, HomepageSection } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const types = [
  'hero',
  'announcement',
  'featuredCategories',
  'featuredProducts',
  'trending',
  'bestSellers',
  'newArrivals',
  'promoBanners',
  'newsletter',
  'footer',
  'navigation',
];

interface FormValues {
  type: string;
  title?: string;
  config: string;
  sortOrder?: number;
  isActive?: boolean;
}

const empty: FormValues = { type: 'hero', title: '', config: '{}', sortOrder: 0, isActive: true };

export function HomepagePage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<HomepageSection | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: empty });

  const listQ = useQuery({
    queryKey: ['homepage-sections', page],
    queryFn: async () =>
      (await api.get<ApiResponse<HomepageSection[]>>('/admin/homepage-sections', { params: { page, limit: 50 } })).data,
  });

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      let config: Record<string, unknown> = {};
      try {
        config = JSON.parse(values.config || '{}');
      } catch {
        throw new Error('Config must be valid JSON');
      }
      const payload = {
        type: values.type,
        title: values.title,
        config,
        sortOrder: values.sortOrder,
        isActive: values.isActive,
      };
      if (editing) return api.put(`/admin/homepage-sections/${editing._id}`, payload);
      return api.post('/admin/homepage-sections', payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Section updated' : 'Section created');
      setOpen(false);
      setEditing(null);
      reset(empty);
      qc.invalidateQueries({ queryKey: ['homepage-sections'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/homepage-sections/${id}`),
    onSuccess: () => {
      toast.success('Section deleted');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['homepage-sections'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const openEdit = (s: HomepageSection) => {
    setEditing(s);
    reset({
      type: s.type,
      title: s.title || '',
      config: JSON.stringify(s.config || {}, null, 2),
      sortOrder: s.sortOrder || 0,
      isActive: s.isActive !== false,
    });
    setOpen(true);
  };

  const columns = useMemo<ColumnDef<HomepageSection>[]>(
    () => [
      { header: 'Type', cell: ({ row }) => <span className="font-mono text-xs">{row.original.type}</span> },
      { header: 'Title', accessorKey: 'title' },
      { header: 'Order', accessorKey: 'sortOrder' },
      {
        header: 'Active',
        cell: ({ row }) => (
          <Badge tone={row.original.isActive !== false ? 'success' : 'muted'}>
            {row.original.isActive !== false ? 'Yes' : 'No'}
          </Badge>
        ),
      },
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
        title="Homepage Manager"
        description="Configure homepage sections and JSON config"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              reset(empty);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add section
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
          emptyTitle="No homepage sections"
        />
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="relative max-h-[90vh] w-full max-w-xl space-y-3 overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">{editing ? 'Edit section' : 'New section'}</h2>
            <div>
              <Label>Type</Label>
              <Select {...register('type')}>
                {types.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div><Label>Title</Label><Input {...register('title')} /></div>
            <div>
              <Label>Config (JSON)</Label>
              <Textarea {...register('config')} rows={10} className="font-mono text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sort order</Label><Input type="number" {...register('sortOrder', { valueAsNumber: true })} /></div>
              <label className="mt-6 flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('isActive')} /> Active
              </label>
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
        title="Delete section?"
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  );
}
