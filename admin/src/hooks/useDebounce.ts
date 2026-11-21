import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function usePagination(initial = 1) {
  const [page, setPage] = useState(initial);
  return { page, setPage };
}
