'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface UsePaginationOptions {
  defaultPage?: number;
  defaultLimit?: number;
  onPageChange?: (page: number, limit: number) => void;
}

export function usePagination(options: UsePaginationOptions = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { defaultPage = 1, defaultLimit = 20, onPageChange } = options;

  // Use searchParams.toString() for stable comparison
  const searchParamsString = searchParams.toString();
  const page = parseInt(searchParams.get('page') || defaultPage.toString(), 10);
  const limit = parseInt(searchParams.get('limit') || defaultLimit.toString(), 10);

  const updateQueryParams = useCallback(
    (newPage: number, newLimit: number) => {
      const params = new URLSearchParams(searchParamsString);
      params.set('page', newPage.toString());
      params.set('limit', newLimit.toString());
      router.push(`?${params.toString()}`, { scroll: false });
      onPageChange?.(newPage, newLimit);
    },
    [searchParamsString, router, onPageChange]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateQueryParams(newPage, limit);
    },
    [updateQueryParams, limit]
  );

  const handleItemsPerPageChange = useCallback(
    (newLimit: number) => {
      // Reset to page 1 when changing items per page
      updateQueryParams(1, newLimit);
    },
    [updateQueryParams]
  );

  return {
    page,
    limit,
    handlePageChange,
    handleItemsPerPageChange,
  };
}
