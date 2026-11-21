import { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/lib/utils';
import type { ApiResponse, MediaAsset } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export function MediaPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ['media', page],
    queryFn: async () =>
      (await api.get<ApiResponse<MediaAsset[]>>('/admin/media', { params: { page, limit: 24 } })).data,
  });

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        await api.post('/admin/media/upload', form);
      }
    },
    onSuccess: () => {
      toast.success('Upload complete');
      qc.invalidateQueries({ queryKey: ['media'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/media/${id}`),
    onSuccess: () => {
      toast.success('Media deleted');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['media'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length) upload.mutate(accepted);
    },
    [upload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [], 'application/pdf': [] },
  });

  const columns = useMemo<ColumnDef<MediaAsset>[]>(
    () => [
      {
        header: 'Preview',
        cell: ({ row }) =>
          row.original.url ? (
            <img src={row.original.url} alt="" className="h-12 w-12 rounded object-cover" />
          ) : (
            '—'
          ),
      },
      {
        header: 'File',
        cell: ({ row }) => (
          <div>
            <p className="max-w-xs truncate font-medium">{row.original.originalName || row.original.filename}</p>
            <a href={row.original.url} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline">
              Open
            </a>
          </div>
        ),
      },
      {
        header: 'Size',
        cell: ({ row }) =>
          row.original.size != null ? `${(row.original.size / 1024).toFixed(1)} KB` : '—',
      },
      { header: 'Uploaded', cell: ({ row }) => formatDate(row.original.createdAt) },
      {
        header: '',
        id: 'actions',
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.original._id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader title="Media" description="Upload and manage store assets" />
      <Card className="mb-4">
        <CardContent className="p-4">
          <div
            {...getRootProps()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center transition hover:border-brand hover:bg-brand-light/40',
              isDragActive && 'border-brand bg-brand-light/50',
              upload.isPending && 'opacity-60'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">
              {upload.isPending ? 'Uploading...' : 'Drop files here or click to upload'}
            </p>
            <p className="mt-1 text-xs text-gray-500">Images, videos, or PDFs</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <DataTable
          columns={columns}
          data={listQ.data?.data || []}
          loading={listQ.isLoading}
          page={page}
          totalPages={listQ.data?.meta?.totalPages || listQ.data?.meta?.pages || 1}
          onPageChange={setPage}
          emptyTitle="No media yet"
          emptyDescription="Upload your first asset using the dropzone above."
        />
      </Card>
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete media?"
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  );
}
