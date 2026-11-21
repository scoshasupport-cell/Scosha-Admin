import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatDateTime, getErrorMessage } from '@/lib/utils';
import type { ApiResponse, Notification } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function NotificationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: async () =>
      (await api.get<ApiResponse<Notification[]>>('/admin/notifications', { params: { page, limit: 20 } })).data,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => api.patch(`/admin/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const markAll = useMutation({
    mutationFn: async () => api.patch('/admin/notifications/read-all'),
    onSuccess: () => {
      toast.success('All notifications marked read');
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const columns = useMemo<ColumnDef<Notification>[]>(
    () => [
      {
        header: 'Notification',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.title}</p>
            <p className="text-xs text-gray-500">{row.original.message}</p>
          </div>
        ),
      },
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
        cell: ({ row }) =>
          !row.original.isRead ? (
            <Button variant="ghost" size="sm" onClick={() => markRead.mutate(row.original._id)}>
              Mark read
            </Button>
          ) : null,
      },
    ],
    [markRead]
  );

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="System and order alerts"
        actions={
          <Button variant="outline" onClick={() => markAll.mutate()} loading={markAll.isPending}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        }
      />
      <Card>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          page={page}
          totalPages={data?.meta?.totalPages || data?.meta?.pages || 1}
          onPageChange={setPage}
          emptyTitle="No notifications"
        />
      </Card>
    </div>
  );
}
