import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { getErrorMessage, idOf } from '@/lib/utils';
import type { ApiResponse, Brand, Category, Product, Variant } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  brandId: z.string().min(1, 'Brand required'),
  categoryId: z.string().min(1, 'Category required'),
  subCategoryId: z.string().optional(),
  basePrice: z.coerce.number().min(0),
  comparePrice: z.coerce.number().optional().nullable(),
  images: z.string().optional(),
  tags: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']),
  featured: z.boolean().optional(),
  trending: z.boolean().optional(),
  newArrival: z.boolean().optional(),
  bestSeller: z.boolean().optional(),
  vipEarlyAccess: z.boolean().optional(),
  badge: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ProductFormPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [variantForm, setVariantForm] = useState({ color: '', hex: '', size: '', price: '', stock: '', sku: '' });

  const productQ = useQuery({
    queryKey: ['product', id],
    enabled: !isNew,
    queryFn: async () => (await api.get<ApiResponse<Product>>(`/admin/products/${id}`)).data,
  });

  const brandsQ = useQuery({
    queryKey: ['brands', 'all'],
    queryFn: async () => (await api.get<ApiResponse<Brand[]>>('/admin/brands', { params: { limit: 100 } })).data,
  });
  const categoriesQ = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: async () => (await api.get<ApiResponse<Category[]>>('/admin/categories', { params: { limit: 100 } })).data,
  });
  const variantsQ = useQuery({
    queryKey: ['variants', id],
    enabled: !isNew,
    queryFn: async () => (await api.get<ApiResponse<Variant[]>>(`/admin/products/${id}/variants`)).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'draft', featured: false, trending: false, newArrival: false, bestSeller: false, vipEarlyAccess: false },
  });

  useEffect(() => {
    const p = productQ.data?.data;
    if (!p) return;
    reset({
      name: p.name,
      slug: p.slug || '',
      description: p.description || '',
      brandId: idOf(p.brandId),
      categoryId: idOf(p.categoryId),
      subCategoryId: idOf(p.subCategoryId) || '',
      basePrice: p.basePrice,
      comparePrice: p.comparePrice ?? undefined,
      images: (p.images || []).join('\n'),
      tags: (p.tags || []).join(', '),
      status: p.status,
      featured: !!p.featured,
      trending: !!p.trending,
      newArrival: !!p.newArrival,
      bestSeller: !!p.bestSeller,
      vipEarlyAccess: !!p.vipEarlyAccess,
      badge: p.badge || '',
    });
  }, [productQ.data, reset]);

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        subCategoryId: values.subCategoryId || null,
        comparePrice: values.comparePrice || null,
        images: values.images
          ? values.images.split('\n').map((s) => s.trim()).filter(Boolean)
          : [],
        tags: values.tags
          ? values.tags.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      if (isNew) return api.post('/admin/products', payload);
      return api.patch(`/admin/products/${id}`, payload);
    },
    onSuccess: (res) => {
      toast.success(isNew ? 'Product created' : 'Product updated');
      qc.invalidateQueries({ queryKey: ['products'] });
      const newId = (res.data as ApiResponse<Product>)?.data?._id;
      if (isNew && newId) navigate(`/products/${newId}`, { replace: true });
      else if (!isNew) productQ.refetch();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const addVariant = useMutation({
    mutationFn: async () =>
      api.post(`/admin/products/${id}/variants`, {
        color: { name: variantForm.color, hex: variantForm.hex || undefined },
        size: variantForm.size,
        price: variantForm.price ? Number(variantForm.price) : undefined,
        stock: variantForm.stock ? Number(variantForm.stock) : 0,
        sku: variantForm.sku || undefined,
      }),
    onSuccess: () => {
      toast.success('Variant added');
      setVariantForm({ color: '', hex: '', size: '', price: '', stock: '', sku: '' });
      variantsQ.refetch();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteVariant = useMutation({
    mutationFn: async (variantId: string) => api.delete(`/admin/products/${id}/variants/${variantId}`),
    onSuccess: () => {
      toast.success('Variant removed');
      variantsQ.refetch();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateVariantStock = useMutation({
    mutationFn: async ({ variantId, stock }: { variantId: string; stock: number }) =>
      api.patch(`/admin/products/${id}/variants/${variantId}`, { stock }),
    onSuccess: () => {
      toast.success('Stock updated');
      variantsQ.refetch();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!isNew && productQ.isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div>
      <PageHeader
        title={isNew ? 'New product' : 'Edit product'}
        backTo="/products"
        description="Product details, pricing, and variants"
      />
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Basic info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input {...register('name')} />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div>
                <Label>Slug</Label>
                <Input {...register('slug')} placeholder="auto-generated if empty" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea {...register('description')} rows={5} />
              </div>
              <div>
                <Label>Images (one URL per line)</Label>
                <Textarea {...register('images')} rows={3} />
              </div>
              <div>
                <Label>Tags (comma separated)</Label>
                <Input {...register('tags')} />
              </div>
            </CardContent>
          </Card>

          {!isNew && (
            <Card>
              <CardHeader>
                <CardTitle>Variants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-6">
                  <Input placeholder="Color" value={variantForm.color} onChange={(e) => setVariantForm({ ...variantForm, color: e.target.value })} />
                  <Input placeholder="Hex" value={variantForm.hex} onChange={(e) => setVariantForm({ ...variantForm, hex: e.target.value })} />
                  <Input placeholder="Size" value={variantForm.size} onChange={(e) => setVariantForm({ ...variantForm, size: e.target.value })} />
                  <Input placeholder="Price" value={variantForm.price} onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })} />
                  <Input placeholder="Stock" value={variantForm.stock} onChange={(e) => setVariantForm({ ...variantForm, stock: e.target.value })} />
                  <Button
                    type="button"
                    onClick={() => addVariant.mutate()}
                    loading={addVariant.isPending}
                    disabled={!variantForm.color || !variantForm.size}
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
                <div className="divide-y rounded-lg border">
                  {(variantsQ.data?.data || []).map((v) => (
                    <div key={v._id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{v.color?.name}</span> / {v.size}
                        <span className="ml-2 text-gray-500">SKU: {v.sku || '—'}</span>
                        <span className="ml-2 text-gray-500">
                          {(v.stock ?? 0) > 0 ? 'In stock' : 'Out of stock'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          className="w-24"
                          defaultValue={v.stock ?? 0}
                          key={`${v._id}-${v.stock}`}
                          id={`stock-${v._id}`}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          loading={updateVariantStock.isPending}
                          onClick={() => {
                            const el = document.getElementById(`stock-${v._id}`) as HTMLInputElement | null;
                            const stock = Math.max(0, Math.floor(Number(el?.value || 0)));
                            updateVariantStock.mutate({ variantId: v._id, stock });
                          }}
                        >
                          Save stock
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => deleteVariant.mutate(v._id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!variantsQ.isLoading && !(variantsQ.data?.data || []).length && (
                    <p className="px-3 py-6 text-center text-sm text-gray-500">No variants yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Brand</Label>
                <Select {...register('brandId')}>
                  <option value="">Select brand</option>
                  {(brandsQ.data?.data || []).map((b) => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </Select>
                {errors.brandId && <p className="mt-1 text-xs text-red-600">{errors.brandId.message}</p>}
              </div>
              <div>
                <Label>Category</Label>
                <Select {...register('categoryId')}>
                  <option value="">Select category</option>
                  {(categoriesQ.data?.data || []).map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </Select>
                {errors.categoryId && <p className="mt-1 text-xs text-red-600">{errors.categoryId.message}</p>}
              </div>
              <div>
                <Label>Subcategory ID (optional)</Label>
                <Input {...register('subCategoryId')} />
              </div>
              <div>
                <Label>Status</Label>
                <Select {...register('status')}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>
              <div>
                <Label>Badge</Label>
                <Input {...register('badge')} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Base price</Label>
                <Input type="number" step="0.01" {...register('basePrice')} />
              </div>
              <div>
                <Label>Compare at price</Label>
                <Input type="number" step="0.01" {...register('comparePrice')} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Flags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(['featured', 'trending', 'newArrival', 'bestSeller', 'vipEarlyAccess'] as const).map((key) => (
                <label key={key} className="flex items-center gap-2">
                  <input type="checkbox" {...register(key)} className="rounded border-gray-300" />
                  <span className="capitalize">{key === 'vipEarlyAccess' ? 'VIP early access' : key.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" loading={isSubmitting || save.isPending}>
            {isNew ? 'Create product' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
