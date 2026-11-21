import { cn } from '@/lib/utils';
import { Badge } from './ui/Badge';

const statusMap: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'brand' }> = {
  active: { label: 'Active', tone: 'success' },
  inactive: { label: 'Inactive', tone: 'muted' },
  draft: { label: 'Draft', tone: 'muted' },
  archived: { label: 'Archived', tone: 'warning' },
  published: { label: 'Published', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'info' },
  processing: { label: 'Processing', tone: 'brand' },
  shipped: { label: 'Shipped', tone: 'info' },
  delivered: { label: 'Delivered', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'danger' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  banned: { label: 'Banned', tone: 'danger' },
  subscribed: { label: 'Subscribed', tone: 'success' },
  unsubscribed: { label: 'Unsubscribed', tone: 'muted' },
  in_stock: { label: 'In stock', tone: 'success' },
  out_of_stock: { label: 'Out of stock', tone: 'danger' },
};

export function StatusBadge({ status, className }: { status?: string; className?: string }) {
  if (!status) return <Badge tone="muted">—</Badge>;
  const key = status.toLowerCase();
  const mapped = statusMap[key] || { label: status, tone: 'muted' as const };
  return (
    <Badge tone={mapped.tone} className={cn(className)}>
      {mapped.label}
    </Badge>
  );
}
