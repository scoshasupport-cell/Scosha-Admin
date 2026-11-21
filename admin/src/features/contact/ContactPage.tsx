import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Check, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatDateTime, getErrorMessage } from '@/lib/utils';
import type { ApiResponse, ContactMessage } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export function ContactPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ContactMessage | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['contact-messages', page],
    queryFn: async () =>
      (await api.get<ApiResponse<ContactMessage[]>>('/admin/contact-messages', { params: { page, limit: 20 } })).data,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => api.patch(`/admin/contact-messages/${id}/read`),
    onSuccess: () => {
      toast.success('Marked as read');
      qc.invalidateQueries({ queryKey: ['contact-messages'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const columns = useMemo<ColumnDef<ContactMessage>[]>(
    () => [
      {
        header: 'From',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-gray-500">{row.original.email}</p>
          </div>
        ),
      },
      { header: 'Subject', cell: ({ row }) => row.original.subject || '—' },
      {
        header: 'Status',
        cell: ({ row }) => (
          <Badge tone={row.original.isRead ? 'muted' : 'info'}>{row.original.isRead ? 'Read' : 'Unread'}</Badge>
        ),
      },
      { header: 'Date', cell: ({ row }) => formatDateTime(row.original.createdAt) },
      {
        header: '',
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => setSelected(row.original)}>
              <Eye className="h-4 w-4" />
            </Button>
            {!row.original.isRead && (
              <Button variant="ghost" size="sm" onClick={() => markRead.mutate(row.original._id)}>
                <Check className="h-4 w-4 text-emerald-600" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [markRead]
  );

  return (
    <div>
      <PageHeader title="Contact Messages" description="Customer inquiries from the storefront" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <DataTable
            columns={columns}
            data={data?.data || []}
            loading={isLoading}
            page={page}
            totalPages={data?.meta?.totalPages || data?.meta?.pages || 1}
            onPageChange={setPage}
            emptyTitle="No messages"
          />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Message detail</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {selected ? (
              <div className="space-y-3">
                <div>
                  <p className="font-semibold">{selected.name}</p>
                  <p className="text-gray-500">{selected.email}</p>
                  {selected.phone && <p className="text-gray-500">{selected.phone}</p>}
                </div>
                <p className="font-medium">{selected.subject || 'No subject'}</p>
                <p className="whitespace-pre-wrap text-gray-700">{selected.message}</p>
                {!selected.isRead && (
                  <Button size="sm" onClick={() => markRead.mutate(selected._id)}>
                    Mark as read
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Select a message to view</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
