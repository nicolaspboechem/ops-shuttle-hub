import { useState, useMemo, useEffect, useCallback } from 'react';

interface UsePaginatedListOptions {
  defaultPageSize?: number;
}

interface UsePaginatedListReturn<T> {
  visibleItems: T[];
  hasMore: boolean;
  loadMore: () => void;
  total: number;
  pageSize: number;
  setPageSize: (n: number) => void;
  reset: () => void;
}

export function usePaginatedList<T>(
  items: T[],
  options?: UsePaginatedListOptions
): UsePaginatedListReturn<T> {
  const defaultSize = options?.defaultPageSize ?? 20;
  const [pageSize, setPageSize] = useState(defaultSize);
  const [visibleCount, setVisibleCount] = useState(defaultSize);

  // Reset when items change (new filter/day)
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items, pageSize]);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount]
  );

  const hasMore = items.length > visibleCount;

  const loadMore = useCallback(() => {
    setVisibleCount(prev => prev + pageSize);
  }, [pageSize]);

  const reset = useCallback(() => {
    setVisibleCount(pageSize);
  }, [pageSize]);

  const handleSetPageSize = useCallback((n: number) => {
    setPageSize(n);
    setVisibleCount(n);
  }, []);

  return {
    visibleItems,
    hasMore,
    loadMore,
    total: items.length,
    pageSize,
    setPageSize: handleSetPageSize,
    reset,
  };
}
