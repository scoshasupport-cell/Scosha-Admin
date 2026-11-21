import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Check, MessageSquare, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatDate, getErrorMessage, idOf } from '@/lib/utils';
import type { ApiResponse, Review } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';

export function ReviewsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [replyId, setReplyId] = useState<string | null>(null);
  const [reply, setReply] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', page, status],
    queryFn: async () =>
      (
        await api.get<ApiResponse<Review[]>>('/admin/reviews', {
          params: { page, limit: 20, status: status || undefined },
        })
      ).data,
  });

  const moderate = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      api.patch(`/admin/reviews/${id}/${action}`),
    onSuccess: (_, v) => {
      toast.success(v.action === 'approve' ? 'Review approved' : 'Review rejected');
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const replyMut = useMutation({
    mutationFn: async () => api.post(`/admin/reviews/${replyId}/reply`, { reply }),
    onSuccess: () => {
      toast.success('Reply posted');
      setReplyId(null);
      setReply('');
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const columns = useMemo<ColumnDef<Review>[]>(
    () => [
      {
        header: 'Review',
        cell: ({ row }) => (
          <div className="max-w-md">
            <p className="font-medium">{row.original.title || `${row.original.rating}★`}</p>
            <p className="line-clamp-2 text-xs text-gray-500">{row.original.comment}</p>
          </div>
        ),
      },
      {
        header: 'Product',
        cell: ({ row }) => {
          const p = typeof row.original.product === 'object' ? row.original.product : null;
          return p?.name || idOf(row.original.productId) || '—';
        },
      },
      {
        header: 'User',
        cell: ({ row }) => {
          const u = typeof row.original.user === 'object' ? row.original.user : null;
          return u?.email || u?.name || '—';
        },
      },
      { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status || 'pending'} /> },
      { header: 'Date', cell: ({ row }) => formatDate(row.original.createdAt) },
      {
        header: '',
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" title="Approve" onClick={() => moderate.mutate({ id: row.original._id, action: 'approve' })}>
              <Check className="h-4 w-4 text-emerald-600" />
            </Button>
            <Button variant="ghost" size="sm" title="Reject" onClick={() => moderate.mutate({ id: row.original._id, action: 'reject' })}>
              <X className="h-4 w-4 text-red-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Reply"
              onClick={() => {
                setReplyId(row.original._id);
                setReply(row.original.reply || '');
              }}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [moderate]
  );

  return (
    <div>
      <PageHeader title="Reviews" description="Moderate customer product reviews" />
      <Card>
        <div className="border-b border-gray-100 p-4">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="max-w-xs">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          page={page}
          totalPages={data?.meta?.totalPages || data?.meta?.pages || 1}
          onPageChange={setPage}
          emptyTitle="No reviews"
        />
      </Card>

      {replyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReplyId(null)} />
          <div className="relative w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Reply to review</h2>
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReplyId(null)}>Cancel</Button>
              <Button onClick={() => replyMut.mutate()} loading={replyMut.isPending} disabled={!reply.trim()}>
                Send reply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
