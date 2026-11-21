import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { downloadBlob, formatDate, getErrorMessage } from '@/lib/utils';
import type { ApiResponse, NewsletterSubscriber } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function NewsletterPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['newsletter', page],
    queryFn: async () =>
      (await api.get<ApiResponse<NewsletterSubscriber[]>>('/admin/newsletter', { params: { page, limit: 30 } })).data,
  });

  const exportList = async (format: 'csv' | 'xlsx') => {
    try {
      const res = await api.get('/admin/newsletter/export', {
        params: { format },
        responseType: 'blob',
      });
      downloadBlob(res.data, `newsletter.${format === 'xlsx' ? 'xlsx' : 'csv'}`);
      toast.success('Export downloaded');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const columns = useMemo<ColumnDef<NewsletterSubscriber>[]>(
    () => [
      { header: 'Email', accessorKey: 'email' },
      { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status || 'subscribed'} /> },
      { header: 'Joined', cell: ({ row }) => formatDate(row.original.createdAt) },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Newsletter"
        description="Email subscribers"
        actions={
          <>
            <Button variant="outline" onClick={() => exportList('csv')}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" onClick={() => exportList('xlsx')}>
              <Download className="h-4 w-4" /> Excel
            </Button>
          </>
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
          emptyTitle="No subscribers"
        />
      </Card>
    </div>
  );
}
