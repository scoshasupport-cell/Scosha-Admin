import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from 'recharts';
import { DollarSign, Package, ShoppingCart, Users, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, idOf } from '@/lib/utils';
import type { ApiResponse, ChartPoint, DashboardStats, Order, Product, Variant } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/StatusBadge';

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string;
  icon: typeof DollarSign;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-xl bg-brand-light p-3 text-brand">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
          {loading ? <Skeleton className="mt-1 h-7 w-24" /> : <p className="truncate text-2xl font-semibold">{value}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/** Normalize chart payloads: either a bare array or `{ series: [...] }`. */
function asChartSeries(payload: unknown): ChartPoint[] {
  if (Array.isArray(payload)) return payload as ChartPoint[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { series?: unknown }).series)) {
    return (payload as { series: ChartPoint[] }).series;
  }
  return [];
}

function asList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    for (const key of ['items', 'data', 'results', 'orders', 'products', 'variants']) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

export function DashboardPage() {
  const statsQ = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => (await api.get<ApiResponse<DashboardStats>>('/admin/dashboard/stats')).data,
  });
  const revenueQ = useQuery({
    queryKey: ['dashboard', 'revenue'],
    queryFn: async () =>
      (await api.get<ApiResponse<ChartPoint[] | { series: ChartPoint[] }>>('/admin/dashboard/charts/revenue', {
        params: { period: '30d' },
      })).data,
  });
  const ordersChartQ = useQuery({
    queryKey: ['dashboard', 'orders-chart'],
    queryFn: async () =>
      (await api.get<ApiResponse<ChartPoint[] | { series: ChartPoint[] }>>('/admin/dashboard/charts/orders')).data,
  });
  const latestOrdersQ = useQuery({
    queryKey: ['dashboard', 'latest-orders'],
    queryFn: async () => (await api.get<ApiResponse<Order[]>>('/admin/dashboard/latest-orders')).data,
  });
  const topProductsQ = useQuery({
    queryKey: ['dashboard', 'top-products'],
    queryFn: async () => (await api.get<ApiResponse<Product[]>>('/admin/dashboard/top-products')).data,
  });
  const lowStockQ = useQuery({
    queryKey: ['dashboard', 'low-stock'],
    queryFn: async () => (await api.get<ApiResponse<Variant[]>>('/admin/dashboard/low-stock')).data,
  });

  const stats = (statsQ.data?.data || {}) as DashboardStats & Record<string, unknown>;
  const revenue = Number(stats.revenue ?? stats.totalRevenue ?? 0);
  const orders = Number(stats.orders ?? stats.ordersCount ?? stats.totalOrders ?? 0);
  const customers = Number(stats.customers ?? stats.totalCustomers ?? 0);
  const products = Number(stats.products ?? stats.totalProducts ?? 0);

  const revenueData = asChartSeries(revenueQ.data?.data).map((p) => ({
    name: p.label || p.date || '',
    value: Number(p.value ?? p.revenue ?? 0),
  }));
  const ordersData = asChartSeries(ordersChartQ.data?.data).map((p) => ({
    name: p.label || p.date || '',
    value: Number(p.value ?? p.orders ?? p.count ?? 0),
  }));

  const latestOrders = asList<Order>(latestOrdersQ.data?.data);
  const topProducts = asList<Product & { quantitySold?: number; revenue?: number; basePrice?: number }>(
    topProductsQ.data?.data,
  );
  const lowStock = asList<Variant & { product?: { name?: string }; color?: { name?: string } }>(
    lowStockQ.data?.data,
  );

  return (
    <div>
      <PageHeader title="Dashboard" description="Store overview and recent activity" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Revenue" value={formatCurrency(revenue)} icon={DollarSign} loading={statsQ.isLoading} />
        <StatCard title="Orders" value={String(orders)} icon={ShoppingCart} loading={statsQ.isLoading} />
        <StatCard title="Customers" value={String(customers)} icon={Users} loading={statsQ.isLoading} />
        <StatCard title="Products" value={String(products)} icon={Package} loading={statsQ.isLoading} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue (30 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {revenueQ.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#008060" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#008060" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#008060" fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {ordersChartQ.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#008060" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Latest orders</CardTitle>
            <Link to="/orders" className="text-xs font-medium text-brand hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestOrdersQ.isLoading && <Skeleton className="h-24 w-full" />}
            {latestOrders.slice(0, 6).map((order) => {
              const oid = idOf(order) || String(order.orderNumber || '');
              return (
                <Link
                  key={oid}
                  to={`/orders/${oid}`}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium">{order.orderNumber || oid.slice(-8)}</p>
                    <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(order.total)}</p>
                    <StatusBadge status={order.status} />
                  </div>
                </Link>
              );
            })}
            {!latestOrdersQ.isLoading && latestOrders.length === 0 && (
              <p className="text-sm text-gray-500">No orders yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top products</CardTitle>
            <Link to="/products" className="text-xs font-medium text-brand hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {topProductsQ.isLoading && <Skeleton className="h-24 w-full" />}
            {topProducts.slice(0, 6).map((p) => {
              const pid = idOf(p) || p.name;
              return (
                <Link
                  key={pid}
                  to={`/products/${pid}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50"
                >
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt="" className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">
                      —
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-gray-500">
                      {p.quantitySold != null
                        ? `${p.quantitySold} sold · ${formatCurrency(Number(p.revenue ?? 0))}`
                        : formatCurrency(Number(p.basePrice ?? 0))}
                    </p>
                  </div>
                </Link>
              );
            })}
            {!topProductsQ.isLoading && topProducts.length === 0 && (
              <p className="text-sm text-gray-500">No sales data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Low stock
            </CardTitle>
            <Link to="/inventory" className="text-xs font-medium text-brand hover:underline">
              Inventory
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStockQ.isLoading && <Skeleton className="h-24 w-full" />}
            {lowStock.slice(0, 6).map((v) => {
              const vid = idOf(v) || v.sku || String(v.stock);
              const productName =
                v.product?.name ||
                (typeof v.productId === 'object' && v.productId && 'name' in v.productId
                  ? String((v.productId as { name?: string }).name || '')
                  : '') ||
                idOf(v.productId) ||
                v.sku ||
                'Variant';
              return (
                <div
                  key={vid}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{productName}</p>
                    <p className="text-xs text-gray-500">
                      {v.color?.name || (v as { colorName?: string }).colorName} / {v.size}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-amber-600">{v.stock ?? 0}</span>
                </div>
              );
            })}
            {!lowStockQ.isLoading && lowStock.length === 0 && (
              <p className="text-sm text-gray-500">Stock looks healthy.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
