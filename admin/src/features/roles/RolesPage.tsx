import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import type { ApiResponse, Role } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';

interface FormValues {
  name: string;
  description?: string;
  permissions?: string;
}

const empty: FormValues = { name: '', description: '', permissions: '' };

export function RolesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Role | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: empty });

  const listQ = useQuery({
    queryKey: ['roles', page],
    queryFn: async () =>
      (await api.get<ApiResponse<Role[]>>('/admin/roles', { params: { page, limit: 20 } })).data,
  });

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        name: values.name,
        description: values.description,
        permissions: values.permissions
          ? values.permissions.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      if (editing) return api.put(`/admin/roles/${editing._id}`, payload);
      return api.post('/admin/roles', payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Role updated' : 'Role created');
      setOpen(false);
      setEditing(null);
      reset(empty);
      qc.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/roles/${id}`),
    onSuccess: () => {
      toast.success('Role deleted');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const openEdit = (r: Role) => {
    setEditing(r);
    const perms = (r.permissions || [])
      .map((p) => (typeof p === 'string' ? p : p._id))
      .join(', ');
    reset({ name: r.name, description: r.description || '', permissions: perms });
    setOpen(true);
  };

  const columns = useMemo<ColumnDef<Role>[]>(
    () => [
      { header: 'Name', accessorKey: 'name' },
      { header: 'Description', cell: ({ row }) => row.original.description || '—' },
      {
        header: 'Permissions',
        cell: ({ row }) => (row.original.permissions || []).length,
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
        title="Roles"
        description="Admin roles and permissions"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              reset(empty);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add role
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
          emptyTitle="No roles"
        />
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="relative w-full max-w-lg space-y-3 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">{editing ? 'Edit role' : 'New role'}</h2>
            <div><Label>Name</Label><Input {...register('name', { required: true })} /></div>
            <div><Label>Description</Label><Textarea {...register('description')} /></div>
            <div>
              <Label>Permission IDs (comma separated)</Label>
              <Textarea {...register('permissions')} placeholder="Optional ObjectIds" />
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
        title="Delete role?"
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  );
}
