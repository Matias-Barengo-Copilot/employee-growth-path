import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Plus, Sparkles, Send, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { SnapCard } from "@/components/snap-card";
import { EmptyState } from "@/components/empty-state";
import { GiveSnapDialog } from "@/components/dialogs/give-snap-dialog";
import { useToast } from "@/hooks/use-toast";
import { useXpToast } from "@/hooks/use-xp-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Snap, Employee } from "@shared/schema";

interface SnapsData {
  snapsReceived: Array<Snap & { sender?: Employee }>;
  snapsSent: Array<Snap & { recipient?: Employee }>;
  allSnaps: Array<Snap & { sender?: Employee; recipient?: Employee }>;
  employees: Employee[];
  currentEmployee: Employee | null;
}

export default function Snaps() {
  const [isGiveSnapOpen, setIsGiveSnapOpen] = useState(false);
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const recipientParam = searchParams.get("recipient");
  const { toast } = useToast();
  const { showXpToast } = useXpToast();

  const { data, isLoading } = useQuery<SnapsData>({
    queryKey: ["/api/snaps"],
  });

  useEffect(() => {
    if (recipientParam && data?.employees) {
      setIsGiveSnapOpen(true);
    }
  }, [recipientParam, data?.employees]);

  const createSnapMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest("POST", "/api/snaps", values);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/snaps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/xp/summary"] });
      toast({ 
        title: "Snap sent!",
        description: "Your recognition has been delivered."
      });
      showXpToast(data.xpAwarded, "Recognition given");
    },
    onError: () => {
      toast({ title: "Failed to send snap", variant: "destructive" });
    },
  });

  const snapsReceived = data?.snapsReceived || [];
  const snapsSent = data?.snapsSent || [];
  const allSnaps = data?.allSnaps || [];
  const employees = data?.employees || [];
  const currentEmployee = data?.currentEmployee;

  const handleGiveSnap = async (values: any) => {
    await createSnapMutation.mutateAsync(values);
  };

  return (
    <div className="flex-1 overflow-auto pb-20 lg:pb-0">
      <PageHeader 
        title="Snaps" 
        description="Quick recognition for great work"
        action={
          <Button onClick={() => setIsGiveSnapOpen(true)} data-testid="button-give-snap">
            <Sparkles className="h-4 w-4 mr-1" />
            Give a Snap
          </Button>
        }
      />
      
      <div className="p-4 lg:p-6 space-y-6">
        <Tabs defaultValue="received" className="space-y-4">
          <TabsList>
            <TabsTrigger value="received" data-testid="tab-received">
              <Inbox className="h-4 w-4 mr-1" />
              Received ({snapsReceived.length})
            </TabsTrigger>
            <TabsTrigger value="sent" data-testid="tab-sent">
              <Send className="h-4 w-4 mr-1" />
              Sent ({snapsSent.length})
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all">
              <Sparkles className="h-4 w-4 mr-1" />
              All ({allSnaps.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="received" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : snapsReceived.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No snaps received yet"
                description="When teammates recognize you, their snaps will appear here."
              />
            ) : (
              <div className="space-y-4">
                {snapsReceived.map((snap) => (
                  <SnapCard
                    key={snap.id}
                    snap={snap}
                    sender={snap.sender}
                    showRecipient={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="sent" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : snapsSent.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No snaps sent yet"
                description="Recognize a teammate for their great work!"
                action={{
                  label: "Give a Snap",
                  onClick: () => setIsGiveSnapOpen(true)
                }}
              />
            ) : (
              <div className="space-y-4">
                {snapsSent.map((snap) => (
                  <SnapCard
                    key={snap.id}
                    snap={snap}
                    sender={currentEmployee}
                    recipient={snap.recipient}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : allSnaps.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No snaps in the feed"
                description="Be the first to recognize a teammate!"
                action={{
                  label: "Give a Snap",
                  onClick: () => setIsGiveSnapOpen(true)
                }}
              />
            ) : (
              <div className="space-y-4">
                {allSnaps.map((snap) => (
                  <SnapCard
                    key={snap.id}
                    snap={snap}
                    sender={snap.sender}
                    recipient={snap.recipient}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <GiveSnapDialog
        open={isGiveSnapOpen}
        onOpenChange={setIsGiveSnapOpen}
        onSubmit={handleGiveSnap}
        employees={employees}
        currentEmployeeId={currentEmployee?.id}
      />
    </div>
  );
}
