import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/utils';
import type { ApiResponse, Customer } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => (await api.get<ApiResponse<Customer>>(`/admin/customers/${id}`)).data,
    enabled: Boolean(id),
  });

  const remove = useMutation({
    mutationFn: async () => api.delete(`/admin/customers/${id}`),
    onSuccess: () => {
      toast.success('Customer deleted');
      qc.invalidateQueries({ queryKey: ['customers'] });
      navigate('/customers');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const toggleVip = useMutation({
    mutationFn: async (isVip: boolean) =>
      api.patch(`/admin/vip/customers/${id}`, {
        isVip,
        ...(isVip
          ? { vipPendingDiscountPercent: 10, freeDeliveryCredits: 5, vipEarlyAccess: true }
          : {}),
      }),
    onSuccess: () => {
      toast.success('VIP status updated');
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['vip-customers'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  const customer = data?.data;
  if (!customer) return <p className="text-sm text-gray-500">Customer not found</p>;

  return (
    <div>
      <PageHeader
        title={customer.name || customer.email}
        backTo="/customers"
        description={customer.email}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={customer.status || 'active'} />
            <Button
              variant="outline"
              loading={toggleVip.isPending}
              onClick={() => toggleVip.mutate(!customer.isVip)}
            >
              {customer.isVip ? 'Revoke VIP' : 'Grant VIP'}
            </Button>
            <Button variant="outline" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-4 w-4 text-red-500" />
              Delete
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Name</span><span>{customer.name || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{customer.email}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Phone</span><span>{customer.phone || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">VIP</span><span>{customer.isVip ? 'Yes' : 'No'}</span></div>
            {customer.isVip && (
              <>
                <div className="flex justify-between"><span className="text-gray-500">Pending VIP discount</span><span>{customer.vipPendingDiscountPercent || 0}%</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Free delivery credits</span><span>{customer.freeDeliveryCredits || 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Early access</span><span>{customer.vipEarlyAccess !== false ? 'Yes' : 'No'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">VIP since</span><span>{formatDate(customer.vipUnlockedAt || undefined)}</span></div>
              </>
            )}
            <div className="flex justify-between"><span className="text-gray-500">Joined</span><span>{formatDate(customer.createdAt)}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Orders</span><span>{customer.ordersCount ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total spent</span><span>{formatCurrency(customer.totalSpent)}</span></div>
          </CardContent>
        </Card>
        {(customer.addresses || []).length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Addresses</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {customer.addresses?.map((a, i) => (
                <div key={i} className="rounded-lg border p-3 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">{a.fullName || a.name}</p>
                  <p>{a.line1}</p>
                  {a.line2 && <p>{a.line2}</p>}
                  <p>
                    {a.city}, {a.state} {a.postalCode || a.zip}
                  </p>
                  <p>{a.country}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {(customer.recentOrders || []).length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Recent orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {customer.recentOrders?.map((o) => (
                <div key={String(o._id || o.id)} className="flex justify-between border-b border-gray-50 py-2 last:border-0">
                  <span>
                    {o.orderNumber || o._id} · {o.status}
                  </span>
                  <span className="font-medium">{formatCurrency(o.total)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete customer?"
        description="This permanently removes the customer, their cart, wishlist, addresses, reviews, and orders. This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
