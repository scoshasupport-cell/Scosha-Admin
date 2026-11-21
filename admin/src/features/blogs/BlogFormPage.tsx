import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import type { ApiResponse, BlogPost } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

interface FormValues {
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  tags?: string;
  status: 'draft' | 'published' | 'archived';
}

export function BlogFormPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { register, handleSubmit, control, reset } = useForm<FormValues>({
    defaultValues: { title: '', status: 'draft', content: '' },
  });

  const blogQ = useQuery({
    queryKey: ['blog', id],
    enabled: !isNew,
    queryFn: async () => (await api.get<ApiResponse<BlogPost>>(`/admin/blogs/${id}`)).data,
  });

  useEffect(() => {
    const p = blogQ.data?.data;
    if (p) {
      reset({
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt || '',
        content: p.content || '',
        coverImage: p.coverImage || '',
        tags: (p.tags || []).join(', '),
        status: p.status || 'draft',
      });
    }
  }, [blogQ.data, reset]);

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        tags: values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        coverImage: values.coverImage || null,
      };
      if (isNew) return api.post('/admin/blogs', payload);
      return api.put(`/admin/blogs/${id}`, payload);
    },
    onSuccess: (res) => {
      toast.success(isNew ? 'Post created' : 'Post updated');
      const newId = (res.data as ApiResponse<BlogPost>)?.data?._id;
      if (isNew && newId) navigate(`/blogs/${newId}`, { replace: true });
      else navigate('/blogs');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!isNew && blogQ.isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div>
      <PageHeader title={isNew ? 'New blog post' : 'Edit blog post'} backTo="/blogs" />
      <Card>
        <CardContent className="space-y-4 p-5">
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
            <div><Label>Title</Label><Input {...register('title', { required: true })} /></div>
            <div><Label>Slug</Label><Input {...register('slug')} /></div>
            <div><Label>Excerpt</Label><Textarea {...register('excerpt')} rows={2} /></div>
            <div><Label>Cover image URL</Label><Input {...register('coverImage')} /></div>
            <div><Label>Tags (comma separated)</Label><Input {...register('tags')} /></div>
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
            <Button type="submit" loading={save.isPending}>Save post</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
