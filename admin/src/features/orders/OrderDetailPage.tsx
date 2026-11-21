import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { downloadBlob, formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils';
import type { ApiResponse, Order, OrderStatus } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

const USD_TO_LBP = 89500;

const statuses: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

function money(order: Order, key: 'shipping' | 'discount') {
  if (key === 'shipping') {
    return Number(
      (order as { shippingCharge?: number }).shippingCharge ?? order.shipping ?? 0,
    );
  }
  return Number(
    (order as { couponDiscount?: number }).couponDiscount ?? order.discount ?? 0,
  );
}

function formatLbp(usd: number) {
  return `${Math.round(Number(usd || 0) * USD_TO_LBP).toLocaleString('en-US')} LBP`;
}

function orderMeta(order: Order) {
  const created = order.createdAt ? new Date(order.createdAt) : null;
  const date = created
    ? created.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : '—';
  const time = created
    ? created.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '—';
  const reference = String(order.orderNumber || order.id || order._id || '').replace(/^(AMZ|SCO)-/, '');
  return { date, time, reference };
}

export function OrderDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [tracking, setTracking] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => (await api.get<ApiResponse<Order>>(`/admin/orders/${id}`)).data,
  });

  const order = data?.data;

  const updateStatus = useMutation({
    mutationFn: async () =>
      api.patch(`/admin/orders/${id}/status`, { status: status || order?.status, note: note || undefined }),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const setTrackingMut = useMutation({
    mutationFn: async () => api.patch(`/admin/orders/${id}/tracking`, { trackingNumber: tracking }),
    onSuccess: () => {
      toast.success('Tracking updated');
      qc.invalidateQueries({ queryKey: ['order', id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const refund = useMutation({
    mutationFn: async () => api.post(`/admin/orders/${id}/refund`, { note: note || undefined }),
    onSuccess: () => {
      toast.success('Refund processed');
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const cancelOrder = useMutation({
    mutationFn: async () =>
      api.patch(`/admin/orders/${id}/status`, {
        status: 'cancelled',
        note: note || 'Cancelled by admin',
      }),
    onSuccess: () => {
      toast.success('Order cancelled');
      setStatus('cancelled');
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const [packingLoading, setPackingLoading] = useState(false);

  const downloadPackingSlip = async () => {
    setPackingLoading(true);
    try {
      const res = await api.get(`/admin/orders/${id}/packing-slip`, { responseType: 'blob' });
      const ref = String(order?.orderNumber || id || 'order').replace(/[^\w.-]+/g, '_');
      downloadBlob(res.data, `packing-receipt-${ref}.pdf`);
      toast.success('Packing receipt downloaded');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setPackingLoading(false);
    }
  };

  if (isLoading || !order) {
    return <Skeleton className="h-96 w-full" />;
  }

  const customer = typeof order.user === 'object' ? order.user : null;
  const userIdObj =
    typeof order.userId === 'object' && order.userId ? order.userId : null;
  const customerName = customer?.name || userIdObj?.name || '—';
  const customerEmail = customer?.email || userIdObj?.email || order.shippingAddress?.email || '—';
  const customerPhone = customer?.phone || userIdObj?.phone || order.shippingAddress?.phone || '—';
  const addr = order.shippingAddress;
  const shipName = addr?.fullName || addr?.name || '—';
  const shipZip = addr?.postalCode || addr?.zip || '';
  const timeline = order.timeline || order.statusHistory || [];
  const canCancel = !['cancelled', 'refunded', 'delivered'].includes(
    String(order.status || '').toLowerCase(),
  );
  const { date, time, reference } = orderMeta(order);

  return (
    <div>
      <PageHeader
        title={`Order ${order.orderNumber || String((order as { id?: string }).id || order._id || '').slice(-8)}`}
        backTo="/orders"
        description={formatDateTime(order.createdAt)}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={downloadPackingSlip} loading={packingLoading}>
              Packing receipt
            </Button>
            <StatusBadge status={order.status} />
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400">Date</p>
            <p className="mt-1 font-semibold">{date}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400">Time</p>
            <p className="mt-1 font-semibold">{time}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400">Reference</p>
            <p className="mt-1 font-semibold tracking-wide">{reference || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400">Total (USD)</p>
            <p className="mt-1 font-semibold">{formatCurrency(order.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400">Lebanese Lira</p>
            <p className="mt-1 font-semibold">{formatLbp(Number(order.total || 0))}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Items ({(order.items || []).length})</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {(order.items || []).map((item, idx) => {
                const unit = Number(item.unitPrice ?? item.price ?? 0);
                const qty = Number(item.quantity) || 0;
                const line = Number(item.lineTotal ?? unit * qty);
                const color = item.color || item.variant?.color || '—';
                const size = item.size || item.variant?.size || '—';
                const thumb = item.image || item.imageUrl || '';
                return (
                  <div key={item._id || item.id || idx} className="flex gap-4 py-4 text-sm">
                    <div className="h-20 w-16 shrink-0 overflow-hidden rounded border bg-gray-50">
                      {thumb ? (
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-[10px] text-gray-400">No image</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{item.name || item.title || 'Item'}</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">
                        Selected size:{' '}
                        <span className="uppercase tracking-wide">{size}</span>
                        {color && color !== '—' ? (
                          <span className="ml-2 font-normal text-gray-500">· {color}</span>
                        ) : null}
                      </p>
                      <dl className="mt-1 grid gap-0.5 text-gray-500 sm:grid-cols-2">
                        <div>
                          <span className="text-gray-400">Reference / SKU:</span> {item.sku || '—'}
                        </div>
                        <div>
                          <span className="text-gray-400">Color:</span> {color}
                        </div>
                        <div>
                          <span className="text-gray-400">Size:</span> {size}
                        </div>
                        <div>
                          <span className="text-gray-400">Qty:</span> {qty}
                        </div>
                        <div>
                          <span className="text-gray-400">Unit (USD):</span> {formatCurrency(unit)}
                        </div>
                        <div>
                          <span className="text-gray-400">Unit (LBP):</span> {formatLbp(unit)}
                        </div>
                      </dl>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold">{formatCurrency(line)}</p>
                      <p className="text-xs text-gray-500">{formatLbp(line)}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {timeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {timeline.map((entry, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 border-b border-gray-50 pb-2 last:border-0">
                    <div>
                      <StatusBadge status={entry.status} />
                      {entry.note ? <p className="mt-1 text-gray-500">{entry.note}</p> : null}
                    </div>
                    <p className="shrink-0 text-xs text-gray-400">
                      {entry.at ? formatDateTime(entry.at) : '—'}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Update status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Status</Label>
                <Select value={status || order.status} onChange={(e) => setStatus(e.target.value)}>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Note</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => updateStatus.mutate()} loading={updateStatus.isPending}>
                  Update status
                </Button>
                {canCancel && (
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (window.confirm('Cancel this order and restore stock?')) {
                        cancelOrder.mutate();
                      }
                    }}
                    loading={cancelOrder.isPending}
                  >
                    Cancel order
                  </Button>
                )}
                <Button variant="danger" onClick={() => refund.mutate()} loading={refund.isPending}>
                  Refund
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tracking</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder="Tracking number"
                value={tracking || order.trackingNumber || ''}
                onChange={(e) => setTracking(e.target.value)}
              />
              <Button onClick={() => setTrackingMut.mutate()} loading={setTrackingMut.isPending}>
                Save tracking
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Payment</span>
                <span>{order.paymentMethod || 'COD'}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="capitalize">{order.deliveryMethod || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{formatCurrency(money(order, 'shipping'))}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span>
                  {formatCurrency(money(order, 'discount'))}
                  {order.couponCode ? ` (${order.couponCode})` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Total (USD)</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total (LBP)</span>
                <span>{formatLbp(Number(order.total || 0))}</span>
              </div>
              {order.notes ? (
                <p className="border-t pt-2 text-gray-500">
                  <span className="font-medium text-gray-700">Notes:</span> {order.notes}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{customerName}</p>
              <p className="text-gray-500">{customerEmail}</p>
              <p className="text-gray-500">{customerPhone}</p>
            </CardContent>
          </Card>

          {addr && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-gray-600">
                <p className="font-medium text-gray-900">{shipName}</p>
                {addr.phone ? <p>{addr.phone}</p> : null}
                {addr.email ? <p>{addr.email}</p> : null}
                <p>{addr.line1}</p>
                {addr.line2 ? <p>{addr.line2}</p> : null}
                <p>
                  {[addr.city, addr.state, shipZip].filter(Boolean).join(', ')}
                </p>
                <p>{addr.country}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
