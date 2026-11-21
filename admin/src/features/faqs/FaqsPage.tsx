import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import type { ApiResponse, Faq } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';

interface FormValues {
  question: string;
  answer: string;
  category?: string;
  sortOrder?: number;
  status: 'active' | 'inactive';
}

const empty: FormValues = { question: '', answer: '', status: 'active', sortOrder: 0 };

export function FaqsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { register, handleSubmit, reset, control } = useForm<FormValues>({ defaultValues: empty });

  const listQ = useQuery({
    queryKey: ['faqs', page],
    queryFn: async () =>
      (await api.get<ApiResponse<Faq[]>>('/admin/faqs', { params: { page, limit: 20 } })).data,
  });

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editing) return api.put(`/admin/faqs/${editing._id}`, values);
      return api.post('/admin/faqs', values);
    },
    onSuccess: () => {
      toast.success(editing ? 'FAQ updated' : 'FAQ created');
      setOpen(false);
      setEditing(null);
      reset(empty);
      qc.invalidateQueries({ queryKey: ['faqs'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/faqs/${id}`),
    onSuccess: () => {
      toast.success('FAQ deleted');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['faqs'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const openEdit = (f: Faq) => {
    setEditing(f);
    reset({
      question: f.question,
      answer: f.answer,
      category: f.category || '',
      sortOrder: f.sortOrder || 0,
      status: f.status || 'active',
    });
    setOpen(true);
  };

  const columns = useMemo<ColumnDef<Faq>[]>(
    () => [
      {
        header: 'Question',
        cell: ({ row }) => <p className="max-w-md font-medium">{row.original.question}</p>,
      },
      { header: 'Category', cell: ({ row }) => row.original.category || '—' },
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
        title="FAQs"
        description="Frequently asked questions"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              reset(empty);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add FAQ
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
          emptyTitle="No FAQs"
        />
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="relative max-h-[90vh] w-full max-w-xl space-y-3 overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">{editing ? 'Edit FAQ' : 'New FAQ'}</h2>
            <div><Label>Question</Label><Input {...register('question', { required: true })} /></div>
            <div>
              <Label>Answer</Label>
              <Controller
                name="answer"
                control={control}
                rules={{ required: true }}
                render={({ field }) => <RichTextEditor value={field.value} onChange={field.onChange} />}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Input {...register('category')} /></div>
              <div><Label>Sort order</Label><Input type="number" {...register('sortOrder', { valueAsNumber: true })} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
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
        title="Delete FAQ?"
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  );
}
