import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { 
  Plus, 
  MessageSquare, 
  Send, 
  Inbox, 
  Clock,
  ArrowDownLeft,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { FeedbackCard } from "@/components/feedback-card";
import { FeedbackRequestCard } from "@/components/feedback-request-card";
import { EmptyState } from "@/components/empty-state";
import { GiveFeedbackDialog } from "@/components/dialogs/give-feedback-dialog";
import { RequestFeedbackDialog } from "@/components/dialogs/request-feedback-dialog";
import { useToast } from "@/hooks/use-toast";
import { useXpToast } from "@/hooks/use-xp-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Feedback, FeedbackRequest, Employee } from "@shared/schema";

interface FeedbackData {
  feedbackReceived: Array<Feedback & { sender?: Employee }>;
  feedbackGiven: Array<Feedback & { recipient?: Employee }>;
  incomingRequests: Array<FeedbackRequest & { requester?: Employee }>;
  outgoingRequests: Array<FeedbackRequest & { responder?: Employee }>;
  employees: Employee[];
  currentEmployee: Employee | null;
}

export default function FeedbackPage() {
  const [isGiveFeedbackOpen, setIsGiveFeedbackOpen] = useState(false);
  const [isRequestFeedbackOpen, setIsRequestFeedbackOpen] = useState(false);
  const [respondingToRequest, setRespondingToRequest] = useState<FeedbackRequest | null>(null);
  const [preselectedRecipient, setPreselectedRecipient] = useState<Employee | null>(null);
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const recipientParam = searchParams.get("recipient");
  const { toast } = useToast();
  const { showXpToast } = useXpToast();

  const { data, isLoading } = useQuery<FeedbackData>({
    queryKey: ["/api/feedback"],
  });

  useEffect(() => {
    if (recipientParam && data?.employees) {
      const recipient = data.employees.find(e => e.id === recipientParam);
      if (recipient) {
        setPreselectedRecipient(recipient);
        setIsGiveFeedbackOpen(true);
      }
    }
  }, [recipientParam, data?.employees]);

  const createFeedbackMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest("POST", "/api/feedback", values);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/xp/summary"] });
      toast({ title: "Feedback sent successfully" });
      setRespondingToRequest(null);
      setPreselectedRecipient(null);
      showXpToast(data.xpAwarded, "Feedback shared");
    },
    onError: () => {
      toast({ title: "Failed to send feedback", variant: "destructive" });
    },
  });

  const requestFeedbackMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest("POST", "/api/feedback/request", values);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      queryClient.invalidateQueries({ queryKey: ["/api/xp/summary"] });
      toast({ title: "Feedback request sent" });
      showXpToast(data.xpAwarded, "Feedback requested");
    },
    onError: () => {
      toast({ title: "Failed to send request", variant: "destructive" });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/feedback/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
    },
  });

  const feedbackReceived = data?.feedbackReceived || [];
  const feedbackGiven = data?.feedbackGiven || [];
  const incomingRequests = data?.incomingRequests || [];
  const outgoingRequests = data?.outgoingRequests || [];
  const employees = data?.employees || [];
  const currentEmployee = data?.currentEmployee;

  const pendingIncomingRequests = incomingRequests.filter(r => r.status === "pending");
  const unreadFeedback = feedbackReceived.filter(f => !f.isRead);

  const handleGiveFeedback = async (values: any) => {
    await createFeedbackMutation.mutateAsync({
      ...values,
      requestId: respondingToRequest?.id,
    });
  };

  const handleRequestFeedback = async (values: any) => {
    await requestFeedbackMutation.mutateAsync(values);
  };

  const handleRespondToRequest = (request: FeedbackRequest & { requester?: Employee }) => {
    setPreselectedRecipient(request.requester || null);
    setRespondingToRequest(request);
    setIsGiveFeedbackOpen(true);
  };

  return (
    <div className="flex-1 overflow-auto pb-20 lg:pb-0">
      <PageHeader 
        title="Feedback" 
        description="Share and request constructive feedback"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsRequestFeedbackOpen(true)} data-testid="button-request-feedback">
              <Clock className="h-4 w-4 mr-1" />
              Request
            </Button>
            <Button onClick={() => setIsGiveFeedbackOpen(true)} data-testid="button-give-feedback">
              <Send className="h-4 w-4 mr-1" />
              Give Feedback
            </Button>
          </div>
        }
      />
      
      <div className="p-4 lg:p-6 space-y-6">
        {pendingIncomingRequests.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Pending Requests</h3>
              <Badge variant="secondary">{pendingIncomingRequests.length}</Badge>
            </div>
            <div className="space-y-3">
              {pendingIncomingRequests.slice(0, 3).map((request) => (
                <FeedbackRequestCard
                  key={request.id}
                  request={request}
                  requester={request.requester}
                  isIncoming={true}
                  onRespond={() => handleRespondToRequest(request)}
                />
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="received" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="received" className="gap-1" data-testid="tab-feedback-received">
              <ArrowDownLeft className="h-4 w-4" />
              Received
              {unreadFeedback.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                  {unreadFeedback.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="given" className="gap-1" data-testid="tab-feedback-given">
              <ArrowUpRight className="h-4 w-4" />
              Given
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-1" data-testid="tab-requests">
              <Clock className="h-4 w-4" />
              Requests
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="received" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-40" />
                ))}
              </div>
            ) : feedbackReceived.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No feedback received yet"
                description="Request feedback from teammates to see their insights here."
                action={{
                  label: "Request Feedback",
                  onClick: () => setIsRequestFeedbackOpen(true)
                }}
              />
            ) : (
              <div className="space-y-4">
                {feedbackReceived.map((feedback) => (
                  <FeedbackCard
                    key={feedback.id}
                    feedback={feedback}
                    sender={feedback.sender}
                    onMarkAsRead={(f) => markAsReadMutation.mutate(f.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="given" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-40" />
                ))}
              </div>
            ) : feedbackGiven.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No feedback given yet"
                description="Share constructive feedback with your teammates."
                action={{
                  label: "Give Feedback",
                  onClick: () => setIsGiveFeedbackOpen(true)
                }}
              />
            ) : (
              <div className="space-y-4">
                {feedbackGiven.map((feedback) => (
                  <FeedbackCard
                    key={feedback.id}
                    feedback={feedback}
                    sender={currentEmployee}
                    showSender={false}
                    showRecipient={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="requests" className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : (
              <>
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <ArrowDownLeft className="h-4 w-4" />
                    Incoming Requests ({incomingRequests.length})
                  </h3>
                  {incomingRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No incoming requests</p>
                  ) : (
                    <div className="space-y-3">
                      {incomingRequests.map((request) => (
                        <FeedbackRequestCard
                          key={request.id}
                          request={request}
                          requester={request.requester}
                          isIncoming={true}
                          onRespond={() => handleRespondToRequest(request)}
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4" />
                    Outgoing Requests ({outgoingRequests.length})
                  </h3>
                  {outgoingRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground mb-3">No outgoing requests</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsRequestFeedbackOpen(true)}
                      >
                        Request Feedback
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {outgoingRequests.map((request) => (
                        <FeedbackRequestCard
                          key={request.id}
                          request={request}
                          responder={request.responder}
                          isIncoming={false}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <GiveFeedbackDialog
        open={isGiveFeedbackOpen}
        onOpenChange={(open) => {
          setIsGiveFeedbackOpen(open);
          if (!open) {
            setRespondingToRequest(null);
            setPreselectedRecipient(null);
          }
        }}
        onSubmit={handleGiveFeedback}
        employees={employees}
        currentEmployeeId={currentEmployee?.id}
        feedbackRequest={respondingToRequest}
        preselectedRecipient={preselectedRecipient}
      />

      <RequestFeedbackDialog
        open={isRequestFeedbackOpen}
        onOpenChange={setIsRequestFeedbackOpen}
        onSubmit={handleRequestFeedback}
        employees={employees}
        currentEmployeeId={currentEmployee?.id}
      />
    </div>
  );
}
