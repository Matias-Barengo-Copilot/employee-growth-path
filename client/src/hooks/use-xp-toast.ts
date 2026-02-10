import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export function useXpToast() {
  const { toast } = useToast();

  const showXpToast = (xpAwarded: number, action?: string) => {
    if (xpAwarded > 0) {
      toast({
        title: `+${xpAwarded} XP`,
        description: action || "Keep up the great work!",
        duration: 2500,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/xp/summary"] });
    }
  };

  return { showXpToast };
}
