import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AICoachProps {
  currentPage: string;
}

const PAGE_PROMPTS: Record<string, string[]> = {
  goals: [
    "Help me set a new goal",
    "How can I make my goals more specific?",
    "What goals should I focus on?",
  ],
  career: [
    "What should my next career milestone be?",
    "How can I earn more XP?",
    "Help me plan my growth path",
  ],
  feedback: [
    "Help me write constructive feedback",
    "How do I give difficult feedback?",
    "What makes feedback effective?",
  ],
  snaps: [
    "Help me write a great recognition message",
    "What should I recognize my teammate for?",
  ],
  home: [
    "What should I focus on this week?",
    "Give me a quick status check",
    "Suggest my next action",
  ],
};

export function AICoach({ currentPage }: AICoachProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);

    const assistantMessage: ChatMessage = { role: "assistant", content: "" };
    setMessages([...updatedMessages, assistantMessage]);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          context: { page: currentPage },
        }),
      });

      if (!res.ok) throw new Error("Coach unavailable");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        let streamDone = false;
        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                streamDone = true;
                break;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulated += parsed.content;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: "assistant",
                      content: accumulated,
                    };
                    return newMessages;
                  });
                }
              } catch {}
            }
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "assistant",
          content: "I'm having trouble connecting right now. Please try again in a moment.",
        };
        return newMessages;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const suggestions = PAGE_PROMPTS[currentPage] || PAGE_PROMPTS.home;

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm lg:bottom-6 lg:right-6">
          <Card className="flex flex-col h-[28rem] overflow-visible shadow-lg border">
            <div className="flex items-center justify-between gap-2 p-3 border-b bg-primary/5 rounded-t-md">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">AI Coach</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-coach"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-3" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Hi! I'm your AI career coach. How can I help you today?
                  </p>
                  <div className="space-y-2">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => sendMessage(s)}
                        className="w-full text-left text-sm p-2 rounded-md border hover-elevate transition-colors"
                        data-testid={`button-suggestion-${i}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "text-sm rounded-lg p-2.5 max-w-[85%]",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-muted"
                      )}
                      data-testid={`chat-message-${i}`}
                    >
                      {msg.content || (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 p-3 border-t"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your coach..."
                disabled={isStreaming}
                className="flex-1"
                data-testid="input-coach-message"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isStreaming || !input.trim()}
                data-testid="button-send-coach"
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </Card>
        </div>
      )}

      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className={cn(
          "fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full shadow-lg lg:bottom-6 lg:right-6",
          isOpen && "invisible"
        )}
        data-testid="button-open-coach"
      >
        <MessageCircle className="h-5 w-5" />
      </Button>
    </>
  );
}
