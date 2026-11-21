import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export function ProfilePage() {
  const admin = useAuthStore((s) => s.admin);
  const logout = useAuthStore((s) => s.logout);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await api.post('/admin/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password changed. Please sign in again.');
      logout();
      window.location.href = '/admin/login';
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
      reset();
    }
  };

  return (
    <div>
      <PageHeader title="Profile" description="Your admin account" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Name</span><span>{admin?.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{admin?.email}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>Current password</Label>
                <Input type="password" {...register('currentPassword')} />
                {errors.currentPassword && <p className="mt-1 text-xs text-red-600">{errors.currentPassword.message}</p>}
              </div>
              <div>
                <Label>New password</Label>
                <Input type="password" {...register('newPassword')} />
                {errors.newPassword && <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>}
              </div>
              <div>
                <Label>Confirm password</Label>
                <Input type="password" {...register('confirmPassword')} />
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
              </div>
              <Button type="submit" loading={loading}>Update password</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
