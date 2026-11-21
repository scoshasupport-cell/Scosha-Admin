import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Award,
  Layers,
  ShoppingCart,
  Users,
  Crown,
  Star,
  Ticket,
  Warehouse,
  Image,
  Home,
  FileText,
  Newspaper,
  HelpCircle,
  Mail,
  Send,
  BarChart3,
  Settings,
  Shield,
  UserCog,
  Bell,
  Ruler,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Products', to: '/products', icon: Package },
  { label: 'Size Charts', to: '/size-charts', icon: Ruler },
  { label: 'Categories', to: '/categories', icon: FolderTree },
  { label: 'Brands', to: '/brands', icon: Award },
  { label: 'Collections', to: '/collections', icon: Layers },
  { label: 'Orders', to: '/orders', icon: ShoppingCart },
  { label: 'Customers', to: '/customers', icon: Users },
  { label: 'VIP Customers', to: '/vip-customers', icon: Crown },
  { label: 'Reviews', to: '/reviews', icon: Star },
  { label: 'Coupons', to: '/coupons', icon: Ticket },
  { label: 'Inventory', to: '/inventory', icon: Warehouse },
  { label: 'Media', to: '/media', icon: Image },
  { label: 'Homepage', to: '/homepage', icon: Home },
  { label: 'Pages', to: '/pages', icon: FileText },
  { label: 'Blogs', to: '/blogs', icon: Newspaper },
  { label: 'FAQs', to: '/faqs', icon: HelpCircle },
  { label: 'Contact', to: '/contact', icon: Mail },
  { label: 'Newsletter', to: '/newsletter', icon: Send },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'Roles', to: '/roles', icon: Shield },
  { label: 'Admins', to: '/admins', icon: UserCog },
  { label: 'Settings', to: '/settings', icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold">A</div>
            <div>
              <p className="text-sm font-semibold">SCOSHA Admin</p>
              <p className="text-[10px] text-sidebar-muted">Commerce console</p>
            </div>
          </div>
          <button className="rounded p-1 text-sidebar-muted hover:bg-sidebar-hover lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-muted transition hover:bg-sidebar-hover hover:text-white',
                  isActive && 'bg-sidebar-hover text-white'
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
