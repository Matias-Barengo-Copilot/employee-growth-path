import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Calendar, Clock, Sun, Heart, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { RequestTimeOffDialog } from "@/components/dialogs/request-time-off-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TimeOffRequest, TimeOffBalance, Employee } from "@shared/schema";
import { format } from "date-fns";

interface PendingRequest extends TimeOffRequest {
  employeeName: string;
  employeeTitle: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Calendar; color: string }> = {
  vacation: { label: "Vacation", icon: Sun, color: "text-amber-600 dark:text-amber-400" },
  sick: { label: "Sick Day", icon: Heart, color: "text-red-600 dark:text-red-400" },
  half_day: { label: "Half Day", icon: Clock, color: "text-blue-600 dark:text-blue-400" },
  personal: { label: "Personal", icon: Calendar, color: "text-purple-600 dark:text-purple-400" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  declined: { label: "Declined", variant: "destructive" },
};

function BalanceCard({ title, used, total, icon: Icon, colorClass }: { title: string; used: number; total: number; icon: typeof Calendar; colorClass: string }) {
  const remaining = total - used;
  const pct = total > 0 ? (used / total) * 100 : 0;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex items-center justify-center h-9 w-9 rounded-md bg-muted ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{remaining} of {total} remaining</p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
          data-testid={`balance-bar-${title.toLowerCase().replace(/\s/g, "-")}`}
        />
      </div>
      <div className="flex items-center justify-between mt-2 flex-wrap gap-1">
        <span className="text-xs text-muted-foreground">{used} used</span>
        <span className="text-xs text-muted-foreground">{total} total</span>
      </div>
    </Card>
  );
}

function RequestCard({ request }: { request: TimeOffRequest }) {
  const config = TYPE_CONFIG[request.type] || TYPE_CONFIG.personal;
  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
  const TypeIcon = config.icon;

  return (
    <Card className="p-4" data-testid={`time-off-request-${request.id}`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-start gap-3">
          <div className={`flex items-center justify-center h-9 w-9 rounded-md bg-muted ${config.color} mt-0.5`}>
            <TypeIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(request.startDate), "MMM d, yyyy")}
              {request.startDate !== request.endDate && ` - ${format(new Date(request.endDate), "MMM d, yyyy")}`}
            </p>
            {request.reason && (
              <p className="text-xs text-muted-foreground mt-1">{request.reason}</p>
            )}
            {request.reviewNote && (
              <p className="text-xs text-muted-foreground mt-1 italic">Note: {request.reviewNote}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusConfig.variant} data-testid={`status-badge-${request.id}`}>
            {statusConfig.label}
          </Badge>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {request.totalDays} {request.totalDays === 1 ? "day" : "days"}
          </span>
        </div>
      </div>
    </Card>
  );
}

function PendingApprovalCard({ request, onApprove, onDecline, isPending }: {
  request: PendingRequest;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  isPending: boolean;
}) {
  const config = TYPE_CONFIG[request.type] || TYPE_CONFIG.personal;
  const TypeIcon = config.icon;

  return (
    <Card className="p-4" data-testid={`pending-request-${request.id}`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-start gap-3">
          <div className={`flex items-center justify-center h-9 w-9 rounded-md bg-muted ${config.color} mt-0.5`}>
            <TypeIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">{request.employeeName}</p>
            <p className="text-xs text-muted-foreground">{request.employeeTitle}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {config.label} &middot; {format(new Date(request.startDate), "MMM d, yyyy")}
              {request.startDate !== request.endDate && ` - ${format(new Date(request.endDate), "MMM d, yyyy")}`}
              {" "}&middot; {request.totalDays} {request.totalDays === 1 ? "day" : "days"}
            </p>
            {request.reason && (
              <p className="text-xs text-muted-foreground mt-1">{request.reason}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDecline(request.id)}
            disabled={isPending}
            data-testid={`button-decline-${request.id}`}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Decline
          </Button>
          <Button
            size="sm"
            onClick={() => onApprove(request.id)}
            disabled={isPending}
            data-testid={`button-approve-${request.id}`}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function TimeOff() {
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const { toast } = useToast();

  const { data: currentEmployee } = useQuery<Employee>({
    queryKey: ["/api/profile"],
  });

  const { data: requests, isLoading: requestsLoading } = useQuery<TimeOffRequest[]>({
    queryKey: ["/api/time-off/requests"],
  });

  const { data: balance, isLoading: balanceLoading } = useQuery<TimeOffBalance>({
    queryKey: ["/api/time-off/balance"],
  });

  const isManagerOrAdmin = currentEmployee?.role === "admin" || currentEmployee?.role === "manager";

  const { data: pendingRequests, isLoading: pendingLoading } = useQuery<PendingRequest[]>({
    queryKey: ["/api/time-off/pending"],
    enabled: isManagerOrAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (values: { type: string; startDate: string; endDate: string; reason?: string }) => {
      return apiRequest("POST", "/api/time-off/requests", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-off/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-off/balance"] });
      toast({ title: "Time off request submitted" });
      setIsRequestOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to submit request", variant: "destructive" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "declined" }) => {
      return apiRequest("PATCH", `/api/time-off/requests/${id}`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-off/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-off/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-off/balance"] });
      toast({ title: `Request ${variables.status}` });
    },
    onError: () => {
      toast({ title: "Failed to review request", variant: "destructive" });
    },
  });

  const isLoading = requestsLoading || balanceLoading;

  const pendingCount = pendingRequests?.length || 0;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Time Off"
        description="Request and manage your time off"
        action={
          <Button onClick={() => setIsRequestOpen(true)} data-testid="button-request-time-off">
            <Plus className="h-4 w-4 mr-2" />
            Request Time Off
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto pb-24 lg:pb-6">
        <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
              </div>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : (
            <>
              {balance && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="balance-cards">
                  <BalanceCard title="Vacation" used={balance.vacationUsed} total={balance.vacationTotal} icon={Sun} colorClass="text-amber-600 dark:text-amber-400" />
                  <BalanceCard title="Sick Days" used={balance.sickUsed} total={balance.sickTotal} icon={Heart} colorClass="text-red-600 dark:text-red-400" />
                  <BalanceCard title="Personal" used={balance.personalUsed} total={balance.personalTotal} icon={Calendar} colorClass="text-purple-600 dark:text-purple-400" />
                </div>
              )}

              <Tabs defaultValue={isManagerOrAdmin && pendingCount > 0 ? "approvals" : "my-requests"}>
                <TabsList data-testid="time-off-tabs">
                  <TabsTrigger value="my-requests" data-testid="tab-my-requests">My Requests</TabsTrigger>
                  {isManagerOrAdmin && (
                    <TabsTrigger value="approvals" data-testid="tab-approvals">
                      Approvals
                      {pendingCount > 0 && (
                        <Badge variant="destructive" className="ml-2">{pendingCount}</Badge>
                      )}
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="my-requests" className="space-y-3 mt-4">
                  {requests && requests.length > 0 ? (
                    requests.map(r => <RequestCard key={r.id} request={r} />)
                  ) : (
                    <EmptyState
                      icon={Calendar}
                      title="No time off requests"
                      description="You haven't submitted any time off requests yet. Click the button above to get started."
                      action={{ label: "Request Time Off", onClick: () => setIsRequestOpen(true) }}
                    />
                  )}
                </TabsContent>

                {isManagerOrAdmin && (
                  <TabsContent value="approvals" className="space-y-3 mt-4">
                    {pendingLoading ? (
                      <div className="space-y-3">
                        {[1, 2].map(i => <Skeleton key={i} className="h-24" />)}
                      </div>
                    ) : pendingRequests && pendingRequests.length > 0 ? (
                      pendingRequests.map(r => (
                        <PendingApprovalCard
                          key={r.id}
                          request={r}
                          onApprove={(id) => reviewMutation.mutate({ id, status: "approved" })}
                          onDecline={(id) => reviewMutation.mutate({ id, status: "declined" })}
                          isPending={reviewMutation.isPending}
                        />
                      ))
                    ) : (
                      <EmptyState
                        icon={CheckCircle}
                        title="All caught up"
                        description="There are no pending time off requests to review."
                      />
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </>
          )}
        </div>
      </div>

      <RequestTimeOffDialog
        open={isRequestOpen}
        onOpenChange={setIsRequestOpen}
        onSubmit={(values) => createMutation.mutate(values)}
        isPending={createMutation.isPending}
      />
    </div>
  );
}
