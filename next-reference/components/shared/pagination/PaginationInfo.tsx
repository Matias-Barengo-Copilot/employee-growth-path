'use client';

import { PaginationMetadata } from '@/lib/types';

interface PaginationInfoProps {
  pagination: PaginationMetadata;
}

export function PaginationInfo({ pagination }: PaginationInfoProps) {
  const { page, limit, total } = pagination;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">No results found</p>;
  }

  return (
    <p className="text-sm text-muted-foreground">
      Showing <span className="font-medium">{start}</span> to{' '}
      <span className="font-medium">{end}</span> of{' '}
      <span className="font-medium">{total}</span> results
    </p>
  );
}
