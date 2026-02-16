import type { PaginationMetadata } from '@/lib/types';

export interface PaginationParams {
  page: number;
  limit: number;
}

export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaults: { page?: number; limit?: number } = {}
): PaginationParams {
  const { page: defaultPage = 1, limit: defaultLimit = 20 } = defaults;

  const rawPage = searchParams.get('page');
  const rawLimit = searchParams.get('limit');

  const page = rawPage ? Math.max(1, parseInt(rawPage, 10) || defaultPage) : defaultPage;
  const limit = rawLimit
    ? Math.max(1, Math.min(100, parseInt(rawLimit, 10) || defaultLimit))
    : defaultLimit;

  return { page, limit };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMetadata {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);

  return {
    page: safePage,
    limit,
    total,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}

export function paginationOffset(page: number, limit: number): number {
  return (Math.max(1, page) - 1) * limit;
}
