'use client';

import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  testId?: string;
}

export function EmptyState({ icon: Icon, message, testId = 'empty-state' }: EmptyStateProps) {
  return (
    <Card data-testid={testId}>
      <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
        <Icon className="size-10 text-muted-foreground" />
        <p className="text-muted-foreground text-sm text-center">{message}</p>
      </CardContent>
    </Card>
  );
}
