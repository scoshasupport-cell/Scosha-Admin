import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/lib/utils';
import type { ApiResponse, Coupon } from '@/types';
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
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrder?: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  startsAt?: string;
  expiresAt?: string;
  status: 'active' | 'inactive';
}

const empty: FormValues = { code: '', type: 'percentage', value: 10, status: 'active' };

export function CouponsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: empty });

  const listQ = useQuery({
    queryKey: ['coupons', page],
    queryFn: async () =>
      (await api.get<ApiResponse<Coupon[]>>('/admin/coupons', { params: { page, limit: 20 } })).data,
  });

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        startsAt: values.startsAt || null,
        expiresAt: values.expiresAt || null,
      };
      if (editing) return api.put(`/admin/coupons/${editing._id}`, payload);
      return api.post('/admin/coupons', payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Coupon updated' : 'Coupon created');
      setOpen(false);
      setEditing(null);
      reset(empty);
      qc.invalidateQueries({ queryKey: ['coupons'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/coupons/${id}`),
    onSuccess: () => {
      toast.success('Coupon deleted');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['coupons'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const openCreate = () => {
    setEditing(null);
    reset(empty);
    setOpen(true);
  };
  const openEdit = (c: Coupon) => {
    setEditing(c);
    reset({
      code: c.code,
      type: c.type,
      value: c.value,
      minOrder: c.minOrder,
      maxDiscount: c.maxDiscount ?? undefined,
      usageLimit: c.usageLimit ?? undefined,
      perUserLimit: c.perUserLimit ?? undefined,
      startsAt: c.startsAt ? c.startsAt.slice(0, 16) : '',
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 16) : '',
      status: c.status || 'active',
    });
    setOpen(true);
  };

  const columns = useMemo<ColumnDef<Coupon>[]>(
    () => [
      { header: 'Code', cell: ({ row }) => <span className="font-mono font-semibold">{row.original.code}</span> },
      {
        header: 'Discount',
        cell: ({ row }) =>
          row.original.type === 'percentage' ? `${row.original.value}%` : `$${row.original.value}`,
      },
      {
        header: 'Usage',
        cell: ({ row }) => `${row.original.usedCount ?? 0}${row.original.usageLimit != null ? ` / ${row.original.usageLimit}` : ''}`,
      },
      { header: 'Expires', cell: ({ row }) => formatDate(row.original.expiresAt) },
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
        title="Coupons"
        description="Discount codes and promotions"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add coupon
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
          emptyTitle="No coupons"
          emptyActionLabel="Add coupon"
          onEmptyAction={openCreate}
        />
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="relative max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">{editing ? 'Edit coupon' : 'New coupon'}</h2>
            <div><Label>Code</Label><Input {...register('code', { required: true })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select {...register('type')}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </Select>
              </div>
              <div>
                <Label>Value</Label>
                <Input type="number" step="0.01" {...register('value', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Min order</Label><Input type="number" {...register('minOrder', { valueAsNumber: true })} /></div>
              <div><Label>Max discount</Label><Input type="number" {...register('maxDiscount', { valueAsNumber: true })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Usage limit</Label><Input type="number" {...register('usageLimit', { valueAsNumber: true })} /></div>
              <div><Label>Per user limit</Label><Input type="number" {...register('perUserLimit', { valueAsNumber: true })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Starts at</Label><Input type="datetime-local" {...register('startsAt')} /></div>
              <div><Label>Expires at</Label><Input type="datetime-local" {...register('expiresAt')} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={save.isPending}>Save</Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete coupon?"
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  );
}
