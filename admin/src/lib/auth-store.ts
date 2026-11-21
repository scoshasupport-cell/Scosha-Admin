import { create } from 'zustand';
import type { AdminUser } from '@/types';

interface AuthState {
  admin: AdminUser | null;
  ready: boolean;
  setAdmin: (admin: AdminUser | null) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  admin: null,
  ready: false,
  setAdmin: (admin) => set({ admin, ready: true }),
  logout: () => set({ admin: null, ready: true }),
  isAuthenticated: () => Boolean(get().admin),
}));
