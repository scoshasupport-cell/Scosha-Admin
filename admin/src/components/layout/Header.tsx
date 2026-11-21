import { Link } from 'react-router-dom';
import { Bell, LogOut, Menu, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import type { ApiResponse, Notification } from '@/types';

interface HeaderProps {
  onMenu: () => void;
}

export function Header({ onMenu }: HeaderProps) {
  const { admin, logout } = useAuthStore();

  const { data } = useQuery({
    queryKey: ['notifications', 'badge'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Notification[]>>('/admin/notifications', {
        params: { page: 1, limit: 5 },
      });
      return res.data;
    },
    refetchInterval: 60000,
  });

  const unread = (data?.data || []).filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur">
      <button className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden" onClick={onMenu}>
        <Menu className="h-5 w-5" />
      </button>
      <div className="hidden text-sm text-gray-500 lg:block">Welcome back{admin?.name ? `, ${admin.name}` : ''}</div>
      <div className="ml-auto flex items-center gap-1">
        <Link
          to="/notifications"
          className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>
        <Link to="/profile" className="rounded-lg p-2 text-gray-600 hover:bg-gray-100" title="Profile">
          <User className="h-5 w-5" />
        </Link>
        <button
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          title="Logout"
          onClick={() => {
            void api.post('/admin/auth/logout').finally(() => {
              logout();
              window.location.href = '/admin/login';
            });
          }}
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
