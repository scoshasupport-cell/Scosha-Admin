import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import type { ApiResponse, CmsPage } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

interface FormValues {
  title: string;
  slug?: string;
  content?: string;
  status: 'draft' | 'published' | 'archived';
}

export function PageFormPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { register, handleSubmit, control, reset } = useForm<FormValues>({
    defaultValues: { title: '', status: 'draft', content: '' },
  });

  const pageQ = useQuery({
    queryKey: ['page', id],
    enabled: !isNew,
    queryFn: async () => (await api.get<ApiResponse<CmsPage>>(`/admin/pages/${id}`)).data,
  });

  useEffect(() => {
    const p = pageQ.data?.data;
    if (p) reset({ title: p.title, slug: p.slug, content: p.content || '', status: p.status || 'draft' });
  }, [pageQ.data, reset]);

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isNew) return api.post('/admin/pages', values);
      return api.put(`/admin/pages/${id}`, values);
    },
    onSuccess: (res) => {
      toast.success(isNew ? 'Page created' : 'Page updated');
      const newId = (res.data as ApiResponse<CmsPage>)?.data?._id;
      if (isNew && newId) navigate(`/pages/${newId}`, { replace: true });
      else navigate('/pages');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!isNew && pageQ.isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div>
      <PageHeader title={isNew ? 'New page' : 'Edit page'} backTo="/pages" />
      <Card>
        <CardContent className="space-y-4 p-5">
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
            <div><Label>Title</Label><Input {...register('title', { required: true })} /></div>
            <div><Label>Slug</Label><Input {...register('slug')} /></div>
            <div>
              <Label>Status</Label>
              <Select {...register('status')}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
            <div>
              <Label>Content</Label>
              <Controller
                name="content"
                control={control}
                render={({ field }) => <RichTextEditor value={field.value} onChange={field.onChange} />}
              />
            </div>
            <Button type="submit" loading={save.isPending}>Save page</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
