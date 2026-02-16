'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface SkeletonCardsProps {
  count?: number;
}

export function SkeletonCards({ count = 3 }: SkeletonCardsProps) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-4 w-48 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-3 w-full bg-muted animate-pulse rounded mb-2" />
            <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
