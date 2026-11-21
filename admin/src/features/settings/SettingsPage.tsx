import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import type { ApiResponse, StoreSettings } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

type FormValues = StoreSettings;

export function SettingsPage() {
  const { register, handleSubmit, reset } = useForm<FormValues>();

  const settingsQ = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get<ApiResponse<StoreSettings>>('/admin/settings')).data,
  });

  useEffect(() => {
    if (settingsQ.data?.data) reset(settingsQ.data.data);
  }, [settingsQ.data, reset]);

  const save = useMutation({
    mutationFn: async (values: FormValues) => api.put('/admin/settings', values),
    onSuccess: () => toast.success('Settings saved'),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (settingsQ.isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div>
      <PageHeader title="Settings" description="Store configuration" />
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Store identity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div><Label>Store name</Label><Input {...register('storeName')} /></div>
            <div><Label>Currency</Label><Input {...register('currency')} /></div>
            <div><Label>Email</Label><Input type="email" {...register('email')} /></div>
            <div><Label>Admin email</Label><Input type="email" {...register('adminEmail')} /></div>
            <div><Label>Phone</Label><Input {...register('phone')} /></div>
            <div><Label>Timezone</Label><Input {...register('timezone')} /></div>
            <div className="sm:col-span-2"><Label>Address</Label><Textarea {...register('address')} /></div>
            <div><Label>Logo URL</Label><Input {...register('logo')} /></div>
            <div><Label>Favicon URL</Label><Input {...register('favicon')} /></div>
            <div><Label>Low stock threshold</Label><Input type="number" {...register('lowStockThreshold', { valueAsNumber: true })} /></div>
            <div><Label>Language</Label><Input {...register('language')} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipping</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div><Label>Standard charge</Label><Input type="number" step="0.01" {...register('shipping.standardCharge', { valueAsNumber: true })} /></div>
            <div><Label>Express charge</Label><Input type="number" step="0.01" {...register('shipping.expressCharge', { valueAsNumber: true })} /></div>
            <div><Label>Free shipping threshold</Label><Input type="number" step="0.01" {...register('shipping.freeShippingThreshold', { valueAsNumber: true })} /></div>
            <div><Label>Standard ETA</Label><Input {...register('shipping.standardEta')} /></div>
            <div><Label>Express ETA</Label><Input {...register('shipping.expressEta')} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Taxes & SEO</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div><Label>Tax rate (%)</Label><Input type="number" step="0.01" {...register('taxes.rate', { valueAsNumber: true })} /></div>
            <label className="mt-6 flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('taxes.included')} /> Tax included in prices
            </label>
            <div><Label>SEO title</Label><Input {...register('seo.title')} /></div>
            <div className="sm:col-span-2"><Label>SEO description</Label><Textarea {...register('seo.description')} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social links</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div><Label>Facebook</Label><Input {...register('socialLinks.facebook')} /></div>
            <div><Label>Instagram</Label><Input {...register('socialLinks.instagram')} /></div>
            <div><Label>Twitter</Label><Input {...register('socialLinks.twitter')} /></div>
            <div><Label>YouTube</Label><Input {...register('socialLinks.youtube')} /></div>
            <div><Label>TikTok</Label><Input {...register('socialLinks.tiktok')} /></div>
          </CardContent>
        </Card>

        <Button type="submit" loading={save.isPending}>Save settings</Button>
      </form>
    </div>
  );
}
