import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage, idOf } from '@/lib/utils';
import type { AdminUser, ApiResponse, Role } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';

interface FormValues {
  name: string;
  email: string;
  password?: string;
  roleId: string;
  status: 'active' | 'banned';
  avatar?: string;
}

const empty: FormValues = { name: '', email: '', password: '', roleId: '', status: 'active' };

export function AdminsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: empty });

  const listQ = useQuery({
    queryKey: ['admins', page],
    queryFn: async () =>
      (await api.get<ApiResponse<AdminUser[]>>('/admin/admins', { params: { page, limit: 20 } })).data,
  });

  const rolesQ = useQuery({
    queryKey: ['roles', 'all'],
    queryFn: async () =>
      (await api.get<ApiResponse<Role[]>>('/admin/roles', { params: { limit: 100 } })).data,
  });

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = { ...values };
      if (editing && !payload.password) delete payload.password;
      if (editing) return api.put(`/admin/admins/${editing._id}`, payload);
      return api.post('/admin/admins', payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Admin updated' : 'Admin created');
      setOpen(false);
      setEditing(null);
      reset(empty);
      qc.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/admins/${id}`),
    onSuccess: () => {
      toast.success('Admin deleted');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const openEdit = (a: AdminUser) => {
    setEditing(a);
    reset({
      name: a.name,
      email: a.email,
      password: '',
      roleId: idOf(a.roleId || a.role),
      status: (a.status as 'active' | 'banned') || 'active',
      avatar: a.avatar || '',
    });
    setOpen(true);
  };

  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        header: 'Admin',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-gray-500">{row.original.email}</p>
          </div>
        ),
      },
      {
        header: 'Role',
        cell: ({ row }) => {
          const role = typeof row.original.role === 'object' ? row.original.role?.name : null;
          return role || idOf(row.original.roleId) || '—';
        },
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
        title="Admins"
        description="Admin users with role assignments"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              reset(empty);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add admin
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
          emptyTitle="No admins"
        />
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="relative w-full max-w-lg space-y-3 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">{editing ? 'Edit admin' : 'New admin'}</h2>
            <div><Label>Name</Label><Input {...register('name', { required: true })} /></div>
            <div><Label>Email</Label><Input type="email" {...register('email', { required: true })} /></div>
            <div>
              <Label>{editing ? 'Password (leave blank to keep)' : 'Password'}</Label>
              <Input type="password" {...register('password', { required: !editing, minLength: 8 })} />
            </div>
            <div>
              <Label>Role</Label>
              <Select {...register('roleId', { required: true })}>
                <option value="">Select role</option>
                {(rolesQ.data?.data || []).map((r) => (
                  <option key={r._id} value={r._id}>{r.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select {...register('status')}>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
              </Select>
            </div>
            <div><Label>Avatar URL</Label><Input {...register('avatar')} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={save.isPending}>Save</Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete admin?"
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  );
}
