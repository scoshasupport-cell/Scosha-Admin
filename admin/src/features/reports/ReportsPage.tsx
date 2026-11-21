import { useState } from 'react';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { downloadBlob, getErrorMessage } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const reports = [
  {
    type: 'top-products',
    label: 'Top 50 Products',
    description: 'Top sellers with product images, qty, sales USD/LBP, and weight % (PDF matches Top 50 catalog style)',
    defaultFormat: 'pdf' as const,
    group: 'Bestsellers',
  },
  {
    type: 'top-by-category',
    label: 'Top 10 per Category',
    description: 'Top sellers for each category — product photos and ranking',
    defaultFormat: 'pdf' as const,
    group: 'Bestsellers',
  },
  {
    type: 'top-by-theme',
    label: 'Top 5 per Theme',
    description: 'Top sellers by collection / theme / tag',
    defaultFormat: 'pdf' as const,
    group: 'Bestsellers',
  },
  {
    type: 'dsr',
    label: 'DSR — Daily Sales',
    description:
      'Daily sales report: tickets, sold qty, cash/credit, targets, LAL, ARP, UPT, ATV — Excel like DSR + PDF summary',
    defaultFormat: 'xlsx' as const,
    group: 'Operations',
  },
  {
    type: 'weekly',
    label: 'Weekly Summary',
    description: 'KPI summary, category weights, L4L, sell-through (SR) alerts vs target',
    defaultFormat: 'pdf' as const,
    group: 'Operations',
  },
  {
    type: 'in-out',
    label: 'In and Out',
    description: 'Stock movements — sales out, returns/restocks in, admin adjustments',
    defaultFormat: 'xlsx' as const,
    group: 'Analytics',
  },
  {
    type: 'pnl',
    label: 'Profit and Loss',
    description: 'Revenue, discounts, COGS, gross profit and contribution for the period',
    defaultFormat: 'xlsx' as const,
    group: 'Analytics',
  },
  {
    type: 'margins',
    label: 'Margins',
    description: 'Gross margin $ and % by product (uses costPrice or estimated cost)',
    defaultFormat: 'xlsx' as const,
    group: 'Analytics',
  },
  {
    type: 'costs',
    label: 'Costs',
    description: 'Unit cost and inventory stock valuation by SKU',
    defaultFormat: 'xlsx' as const,
    group: 'Analytics',
  },
  {
    type: 'kpis',
    label: 'KPIs',
    description: 'Tickets, units, sales, UPT, average basket, margin, stock on hand',
    defaultFormat: 'xlsx' as const,
    group: 'Analytics',
  },
  {
    type: 'upt',
    label: 'UPT',
    description: 'Units per transaction by day',
    defaultFormat: 'xlsx' as const,
    group: 'Analytics',
  },
  {
    type: 'average-basket',
    label: 'Average Basket',
    description: 'Average order value (ATV) and units per ticket by day',
    defaultFormat: 'xlsx' as const,
    group: 'Analytics',
  },
  {
    type: 'leftovers',
    label: 'Leftovers',
    description: 'Slow movers / no-sales stock with leftover inventory value',
    defaultFormat: 'xlsx' as const,
    group: 'Analytics',
  },
  { type: 'sales', label: 'Sales', description: 'Sales report by period', group: 'Exports' },
  { type: 'revenue', label: 'Revenue', description: 'Revenue breakdown by day', group: 'Exports' },
  { type: 'orders', label: 'Orders', description: 'Order export', group: 'Exports' },
  { type: 'customers', label: 'Customers', description: 'Customer list export', group: 'Exports' },
  { type: 'products', label: 'Products', description: 'Product catalog export', group: 'Exports' },
  { type: 'inventory', label: 'Inventory', description: 'Stock levels export', group: 'Exports' },
] as const;

const GROUPS = ['Analytics', 'Bestsellers', 'Operations', 'Exports'] as const;

export function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dailyTarget, setDailyTarget] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const download = async (type: string, format: 'csv' | 'xlsx' | 'pdf') => {
    const key = `${type}-${format}`;
    setLoading(key);
    try {
      const res = await api.get(`/admin/reports/${type}`, {
        params: {
          format,
          from: from || undefined,
          to: to || undefined,
          dailyTarget: dailyTarget || undefined,
          limit:
            type === 'top-products' ? 50 : type === 'top-by-category' ? 10 : type === 'top-by-theme' ? 5 : undefined,
        },
        responseType: 'blob',
      });
      const ext = format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
      downloadBlob(res.data, `${type}-report.${ext}`);
      toast.success(`${type} ${format.toUpperCase()} downloaded`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Analytics (P&L, margins, UPT, leftovers), bestsellers, DSR — CSV, Excel, or PDF"
      />
      <Card className="mb-6">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <Label>Daily sales target (USD) — used in DSR</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="e.g. 4466"
              value={dailyTarget}
              onChange={(e) => setDailyTarget(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {GROUPS.map((group) => (
        <div key={group} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{group}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {reports
              .filter((r) => r.group === group)
              .map((r) => (
                <Card key={r.type}>
                  <CardHeader>
                    <CardTitle>{r.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 text-sm text-gray-500">{r.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        loading={loading === `${r.type}-csv`}
                        onClick={() => download(r.type, 'csv')}
                      >
                        <Download className="h-4 w-4" /> CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        loading={loading === `${r.type}-xlsx`}
                        onClick={() => download(r.type, 'xlsx')}
                      >
                        <Download className="h-4 w-4" /> Excel
                      </Button>
                      <Button
                        variant={'defaultFormat' in r && r.defaultFormat === 'pdf' ? 'primary' : 'outline'}
                        size="sm"
                        loading={loading === `${r.type}-pdf`}
                        onClick={() => download(r.type, 'pdf')}
                      >
                        <Download className="h-4 w-4" /> PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
