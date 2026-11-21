import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Crown, Eye, Megaphone, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/utils';
import type { ApiResponse, Customer } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useDebounce } from '@/hooks/useDebounce';

function customerId(c: Customer) {
  return String(c._id || (c as Customer & { id?: string | number }).id || '');
}

export function VipCustomersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Customer | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [form, setForm] = useState({
    isVip: true,
    vipPendingDiscountPercent: 10,
    freeDeliveryCredits: 5,
    vipEarlyAccess: true,
  });
  const debounced = useDebounce(q);

  const { data, isLoading } = useQuery({
    queryKey: ['vip-customers', page, debounced],
    queryFn: async () =>
      (
        await api.get<ApiResponse<Customer[]>>('/admin/vip/customers', {
          params: { page, limit: 20, q: debounced || undefined },
        })
      ).data,
  });

  const saveVip = useMutation({
    mutationFn: async () => {
      if (!edit) return;
      return api.patch(`/admin/vip/customers/${customerId(edit)}`, form);
    },
    onSuccess: () => {
      toast.success('VIP membership updated');
      setEdit(null);
      qc.invalidateQueries({ queryKey: ['vip-customers'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const broadcast = useMutation({
    mutationFn: async () =>
      api.post('/admin/vip/broadcast', {
        productId: productId || undefined,
        collectionId: collectionId || undefined,
      }),
    onSuccess: () => {
      toast.success('Early-access announcement queued to VIP members');
      setBroadcastOpen(false);
      setProductId('');
      setCollectionId('');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        header: 'VIP Customer',
        cell: ({ row }) => (
          <div>
            <p className="flex items-center gap-1.5 font-medium">
              <Crown className="h-3.5 w-3.5 text-amber-600" />
              {row.original.name || '—'}
            </p>
            <p className="text-xs text-gray-500">{row.original.email}</p>
          </div>
        ),
      },
      {
        header: 'Benefits',
        cell: ({ row }) => (
          <div className="space-y-1 text-xs text-gray-600">
            <p>{row.original.vipPendingDiscountPercent || 0}% pending discount</p>
            <p>{row.original.freeDeliveryCredits || 0} free deliveries</p>
            {row.original.vipEarlyAccess !== false && <Badge tone="brand">Early access</Badge>}
          </div>
        ),
      },
      {
        header: 'Orders / Spent',
        cell: ({ row }) => (
          <div className="text-sm">
            <p>{row.original.ordersCount ?? 0} orders</p>
            <p className="text-xs text-gray-500">{formatCurrency(row.original.totalSpent)}</p>
          </div>
        ),
      },
      {
        header: 'VIP since',
        cell: ({ row }) => formatDate(row.original.vipUnlockedAt || undefined),
      },
      {
        header: '',
        id: 'actions',
        cell: ({ row }) => {
          const id = customerId(row.original);
          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEdit(row.original);
                  setForm({
                    isVip: true,
                    vipPendingDiscountPercent: row.original.vipPendingDiscountPercent ?? 10,
                    freeDeliveryCredits: row.original.freeDeliveryCredits ?? 0,
                    vipEarlyAccess: row.original.vipEarlyAccess !== false,
                  });
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/customers/${id}`)}>
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [navigate]
  );

  return (
    <div>
      <PageHeader
        title="VIP Customers"
        description="Members unlocked by $300+ orders or granted manually — benefits, early access, and announcements"
        actions={
          <Button variant="outline" onClick={() => setBroadcastOpen(true)}>
            <Megaphone className="h-4 w-4" /> Announce early access
          </Button>
        }
      />
      <Card>
        <div className="border-b border-gray-100 p-4">
          <Input
            placeholder="Search VIP by name, email, phone…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          page={page}
          totalPages={data?.meta?.totalPages || data?.meta?.pages || 1}
          onPageChange={setPage}
          emptyTitle="No VIP customers yet"
        />
      </Card>
      <p className="mt-3 text-xs text-gray-500">
        Tip: grant VIP from a{' '}
        <Link to="/customers" className="underline">
          customer detail
        </Link>{' '}
        page, or it unlocks automatically on a $300+ order.
      </p>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEdit(null)} />
          <div className="relative w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Edit VIP — {edit.email}</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isVip}
                onChange={(e) => setForm((f) => ({ ...f, isVip: e.target.checked }))}
              />
              VIP member
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.vipEarlyAccess}
                onChange={(e) => setForm((f) => ({ ...f, vipEarlyAccess: e.target.checked }))}
              />
              Early access to VIP collections
            </label>
            <div>
              <Label>Pending next-order discount %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.vipPendingDiscountPercent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vipPendingDiscountPercent: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div>
              <Label>Free delivery credits</Label>
              <Input
                type="number"
                min={0}
                value={form.freeDeliveryCredits}
                onChange={(e) =>
                  setForm((f) => ({ ...f, freeDeliveryCredits: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEdit(null)}>
                Cancel
              </Button>
              <Button loading={saveVip.isPending} onClick={() => saveVip.mutate()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {broadcastOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBroadcastOpen(false)} />
          <div className="relative w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Email VIP early access</h2>
            <p className="text-sm text-gray-500">
              Send an announcement to all active VIP members. Provide a product ID or collection ID.
            </p>
            <div>
              <Label>Product ID</Label>
              <Input value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="e.g. 42" />
            </div>
            <div>
              <Label>Collection ID</Label>
              <Input
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                placeholder="e.g. 7"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBroadcastOpen(false)}>
                Cancel
              </Button>
              <Button
                loading={broadcast.isPending}
                disabled={!productId && !collectionId}
                onClick={() => broadcast.mutate()}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
