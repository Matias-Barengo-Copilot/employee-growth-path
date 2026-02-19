'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getLeaveTotals, type LeaveTotalByEmployee } from '@/lib/api/leave-requests';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ChevronRight } from 'lucide-react';

const currentYear = new Date().getFullYear();

export default function LeavesTotalPage() {
  const router = useRouter();
  const [totals, setTotals] = useState<LeaveTotalByEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTotals = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getLeaveTotals();
        if (response.success && response.data) {
          setTotals(response.data);
        } else {
          setError(response.error?.message ?? 'Failed to fetch leave totals');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('Only HR') || msg.includes('leave totals access')) {
          router.push('/');
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchTotals();
  }, [router]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leaves total</h1>
          <p className="text-muted-foreground mt-2">
            Leave days by type for {currentYear} (approved only)
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leaves total</h1>
          <p className="text-muted-foreground mt-2">
            Leave days by type for {currentYear} (approved only)
          </p>
        </div>
        <Card>
          <CardContent className="py-12">
            <p className="text-destructive text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaves total</h1>
        <p className="text-muted-foreground mt-2">
          Leave days by type for {currentYear} (approved only). Click a row to view leave history.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-medium p-4">Name</th>
                  <th className="text-left font-medium p-4">Email</th>
                  <th className="text-right font-medium p-4">Personal/Sick</th>
                  <th className="text-right font-medium p-4">Vacation</th>
                  <th className="text-right font-medium p-4">Unpaid</th>
                  <th className="text-right font-medium p-4">Other</th>
                  <th className="text-right font-medium p-4">Total</th>
                  <th className="w-10" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {totals.map((row) => (
                  <tr
                    key={row.employeeId}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/leaves-total/${row.employeeId}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/leaves-total/${row.employeeId}`);
                      }
                    }}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    aria-label={`View leave history for ${row.name}`}
                  >
                    <td className="p-4 font-medium">{row.name}</td>
                    <td className="p-4 text-muted-foreground">{row.email}</td>
                    <td className="p-4 text-right">{row.personal_sick}</td>
                    <td className="p-4 text-right">{row.vacation}</td>
                    <td className="p-4 text-right">{row.unpaid}</td>
                    <td className="p-4 text-right">{row.other}</td>
                    <td className="p-4 text-right font-medium">{row.total}</td>
                    <td className="p-2 text-muted-foreground">
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totals.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No employees found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
