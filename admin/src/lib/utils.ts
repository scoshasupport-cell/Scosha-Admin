import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value?: number | null, currency = 'USD') {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

export function formatDate(value?: string | Date | null, pattern = 'MMM d, yyyy') {
  if (!value) return '—';
  const date = typeof value === 'string' ? parseISO(value) : value;
  if (!isValid(date)) return '—';
  return format(date, pattern);
}

export function formatDateTime(value?: string | Date | null) {
  return formatDate(value, 'MMM d, yyyy HH:mm');
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const err = error as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    return err.response?.data?.message || err.response?.data?.error || err.message || fallback;
  }
  return fallback;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function idOf(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const obj = value as { id?: string | number; _id?: string | number };
    if (obj.id != null) return String(obj.id);
    if (obj._id != null) return String(obj._id);
  }
  return '';
}
