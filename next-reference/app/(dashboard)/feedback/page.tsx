'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, Send, Plus, Clock, Check, Eye, EyeOff, ArrowUpRight, ArrowDownLeft, Inbox } from 'lucide-react';

interface FeedbackItem {
  id: string;
  senderId: string | null;
  recipientId: string;
  companyId: string;
  requestId: string | null;
  keepDoing: string | null;
  considerImproving: string | null;
  tags: string[] | null;
  isAnonymous: boolean;
  isRead: boolean;
  createdAt: string;
  senderName: string | null;
  recipientName: string;
}

interface FeedbackRequest {
  id: string;
  requesterId: string;
  responderId: string;
  companyId: string;
  prompt: string | null;
  status: string;
  deadline: string | null;
  createdAt: string;
  requesterName: string;
  responderName: string;
}

interface EligibleEmployee {
  id: string;
  name: string;
  email: string;
}

const FEEDBACK_TAGS = [
  'Communication',
  'Technical Skills',
  'Leadership',
  'Collaboration',
  'Initiative',
  'Reliability',
];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type TabType = 'received' | 'given' | 'requests';

export default function FeedbackPage() {
  const { data: session, status: sessionStatus } = useSession();
  const currentUserId = session?.user?.employeeId;

  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [feedbackRequests, setFeedbackRequests] = useState<FeedbackRequest[]>([]);
  const [employees, setEmployees] = useState<EligibleEmployee[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const loading = dataLoading || sessionStatus === 'loading' || !currentUserId;

  const [giveFeedbackOpen, setGiveFeedbackOpen] = useState(false);
  const [requestFeedbackOpen, setRequestFeedbackOpen] = useState(false);

  const [recipientId, setRecipientId] = useState('');
  const [keepDoing, setKeepDoing] = useState('');
  const [considerImproving, setConsiderImproving] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [respondingToRequestId, setRespondingToRequestId] = useState<string | undefined>(undefined);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const [responderId, setResponderId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const receivedFeedback = useMemo(() => {
    if (!currentUserId) return [];
    return feedbackItems.filter((item) => item.recipientId === currentUserId);
  }, [feedbackItems, currentUserId]);

  const givenFeedback = useMemo(() => {
    if (!currentUserId) return [];
    return feedbackItems.filter((item) => item.senderId === currentUserId);
  }, [feedbackItems, currentUserId]);

  const myRequests = useMemo(() => {
    if (!currentUserId) return [];
    return feedbackRequests.filter((req) => req.requesterId === currentUserId);
  }, [feedbackRequests, currentUserId]);

  const requestsToMe = useMemo(() => {
    if (!currentUserId) return [];
    return feedbackRequests.filter((req) => req.responderId === currentUserId);
  }, [feedbackRequests, currentUserId]);

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch('/api/feedback');
      const json = await res.json();
      if (json.success) setFeedbackItems(json.data);
    } catch {
      // silently fail
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/feedback-requests');
      const json = await res.json();
      if (json.success) setFeedbackRequests(json.data);
    } catch {
      // silently fail
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees/eligible');
      const json = await res.json();
      if (json.success) setEmployees(json.data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchFeedback(), fetchRequests(), fetchEmployees()]).finally(() =>
      setDataLoading(false)
    );
  }, [fetchFeedback, fetchRequests, fetchEmployees]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      setFeedbackItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
      );
    } catch {
      // silently fail
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const resetGiveFeedbackForm = () => {
    setRecipientId('');
    setKeepDoing('');
    setConsiderImproving('');
    setSelectedTags([]);
    setIsAnonymous(false);
    setRespondingToRequestId(undefined);
  };

  const resetRequestFeedbackForm = () => {
    setResponderId('');
    setPrompt('');
    setDeadline('');
  };

  const handleGiveFeedback = async () => {
    if (!recipientId) return;
    setSubmittingFeedback(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId,
          requestId: respondingToRequestId,
          keepDoing: keepDoing.trim() || undefined,
          considerImproving: considerImproving.trim() || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          isAnonymous,
        }),
      });
      const json = await res.json();
      if (json.success) {
        resetGiveFeedbackForm();
        setGiveFeedbackOpen(false);
        fetchFeedback();
        fetchRequests();
      }
    } catch {
      // silently fail
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleRequestFeedback = async () => {
    if (!responderId) return;
    setSubmittingRequest(true);
    try {
      const res = await fetch('/api/feedback-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responderId,
          prompt: prompt.trim() || undefined,
          deadline: deadline || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        resetRequestFeedbackForm();
        setRequestFeedbackOpen(false);
        fetchRequests();
      }
    } catch {
      // silently fail
    } finally {
      setSubmittingRequest(false);
    }
  };

  const openRespondDialog = (request: FeedbackRequest) => {
    resetGiveFeedbackForm();
    setRecipientId(request.requesterId);
    setRespondingToRequestId(request.id);
    setGiveFeedbackOpen(true);
  };

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'received', label: 'Received', count: receivedFeedback.filter((f) => !f.isRead).length },
    { key: 'given', label: 'Given' },
    { key: 'requests', label: 'Requests', count: requestsToMe.filter((r) => r.status === 'pending').length },
  ];

  const renderFeedbackContent = (item: FeedbackItem) => (
    <CardContent className="flex flex-col gap-4">
      {item.keepDoing && (
        <div className="flex flex-col gap-1" data-testid={`section-keep-doing-${item.id}`}>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Keep Doing
          </span>
          <p className="text-sm">{item.keepDoing}</p>
        </div>
      )}
      {item.considerImproving && (
        <div className="flex flex-col gap-1" data-testid={`section-consider-improving-${item.id}`}>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Consider Improving
          </span>
          <p className="text-sm">{item.considerImproving}</p>
        </div>
      )}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="no-default-hover-elevate no-default-active-elevate"
              data-testid={`badge-tag-${item.id}-${tag.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </CardContent>
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">
            Feedback
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              resetRequestFeedbackForm();
              setRequestFeedbackOpen(true);
            }}
            data-testid="button-request-feedback"
          >
            <Clock />
            Request Feedback
          </Button>
          <Button
            onClick={() => {
              resetGiveFeedbackForm();
              setGiveFeedbackOpen(true);
            }}
            data-testid="button-give-feedback"
          >
            <Plus />
            Give Feedback
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground'
            }`}
            onClick={() => setActiveTab(tab.key)}
            data-testid={`tab-${tab.key}`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <Badge variant="default" className="no-default-hover-elevate no-default-active-elevate text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
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
      ) : activeTab === 'received' ? (
        receivedFeedback.length === 0 ? (
          <Card data-testid="empty-state-received">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <Inbox className="size-10 text-muted-foreground" />
              <p className="text-muted-foreground text-sm text-center">
                No feedback received yet. Ask a colleague for feedback to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {receivedFeedback.map((item) => (
              <Card
                key={item.id}
                className="relative"
                data-testid={`card-feedback-received-${item.id}`}
                onClick={() => {
                  if (!item.isRead) markAsRead(item.id);
                }}
              >
                {!item.isRead && (
                  <span
                    className="absolute top-4 right-4 size-2.5 rounded-full bg-primary"
                    data-testid={`indicator-unread-${item.id}`}
                  />
                )}
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="size-4 text-muted-foreground" />
                    <span className="font-medium text-sm" data-testid={`text-sender-${item.id}`}>
                      {item.isAnonymous ? 'Anonymous' : (item.senderName ?? 'Unknown')}
                    </span>
                    {item.isAnonymous && (
                      <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                        <EyeOff className="size-3" />
                        Anonymous
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground" data-testid={`text-date-${item.id}`}>
                    {formatDate(item.createdAt)}
                  </span>
                </CardHeader>
                {renderFeedbackContent(item)}
              </Card>
            ))}
          </div>
        )
      ) : activeTab === 'given' ? (
        givenFeedback.length === 0 ? (
          <Card data-testid="empty-state-given">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <Send className="size-10 text-muted-foreground" />
              <p className="text-muted-foreground text-sm text-center">
                You haven&apos;t given any feedback yet. Share constructive feedback with your colleagues.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {givenFeedback.map((item) => (
              <Card
                key={item.id}
                data-testid={`card-feedback-given-${item.id}`}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="size-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">To</span>
                    <span className="font-medium text-sm" data-testid={`text-recipient-${item.id}`}>
                      {item.recipientName}
                    </span>
                    {item.isAnonymous && (
                      <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                        <EyeOff className="size-3" />
                        Sent anonymously
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground" data-testid={`text-date-${item.id}`}>
                    {formatDate(item.createdAt)}
                  </span>
                </CardHeader>
                {renderFeedbackContent(item)}
              </Card>
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-6">
          {requestsToMe.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Pending from you
              </h3>
              {requestsToMe.map((req) => (
                <Card key={req.id} data-testid={`card-request-to-me-${req.id}`}>
                  <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm" data-testid={`text-requester-${req.id}`}>
                        {req.requesterName} requested your feedback
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(req.createdAt)}
                        {req.deadline && ` \u00B7 Due ${formatDate(req.deadline)}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={req.status === 'completed' ? 'success' : 'secondary'}
                        className="no-default-hover-elevate no-default-active-elevate"
                        data-testid={`badge-status-${req.id}`}
                      >
                        {req.status === 'completed' ? <Check className="size-3" /> : <Clock className="size-3" />}
                        {req.status}
                      </Badge>
                      {req.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => openRespondDialog(req)}
                          data-testid={`button-respond-${req.id}`}
                        >
                          <Send />
                          Respond
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  {req.prompt && (
                    <CardContent>
                      <p className="text-sm" data-testid={`text-prompt-${req.id}`}>
                        {req.prompt}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          {myRequests.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Your requests
              </h3>
              {myRequests.map((req) => (
                <Card key={req.id} data-testid={`card-my-request-${req.id}`}>
                  <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm" data-testid={`text-responder-${req.id}`}>
                        Requested from {req.responderName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(req.createdAt)}
                        {req.deadline && ` \u00B7 Due ${formatDate(req.deadline)}`}
                      </span>
                    </div>
                    <Badge
                      variant={req.status === 'completed' ? 'success' : 'secondary'}
                      className="no-default-hover-elevate no-default-active-elevate"
                      data-testid={`badge-status-${req.id}`}
                    >
                      {req.status === 'completed' ? <Check className="size-3" /> : <Clock className="size-3" />}
                      {req.status}
                    </Badge>
                  </CardHeader>
                  {req.prompt && (
                    <CardContent>
                      <p className="text-sm" data-testid={`text-prompt-${req.id}`}>
                        {req.prompt}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          {requestsToMe.length === 0 && myRequests.length === 0 && (
            <Card data-testid="empty-state-requests">
              <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                <Clock className="size-10 text-muted-foreground" />
                <p className="text-muted-foreground text-sm text-center">
                  No feedback requests yet. Request feedback from a colleague to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog
        open={giveFeedbackOpen}
        onOpenChange={(open) => {
          setGiveFeedbackOpen(open);
          if (!open) resetGiveFeedbackForm();
        }}
      >
        <DialogContent data-testid="dialog-give-feedback">
          <DialogHeader>
            <DialogTitle>Give Feedback</DialogTitle>
            <DialogDescription>Share constructive feedback with a team member.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="feedback-recipient">Recipient</Label>
              <Select value={recipientId} onValueChange={setRecipientId}>
                <SelectTrigger
                  className="w-full"
                  data-testid="select-feedback-recipient"
                  id="feedback-recipient"
                >
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem
                      key={emp.id}
                      value={emp.id}
                      data-testid={`select-item-recipient-${emp.id}`}
                    >
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="feedback-keep-doing">Keep Doing</Label>
              <Textarea
                id="feedback-keep-doing"
                placeholder="What should this person keep doing?"
                value={keepDoing}
                onChange={(e) => setKeepDoing(e.target.value)}
                data-testid="textarea-keep-doing"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="feedback-consider-improving">Consider Improving</Label>
              <Textarea
                id="feedback-consider-improving"
                placeholder="What could this person improve on?"
                value={considerImproving}
                onChange={(e) => setConsiderImproving(e.target.value)}
                data-testid="textarea-consider-improving"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer toggle-elevate"
                    onClick={() => toggleTag(tag)}
                    data-testid={`badge-tag-${tag.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="feedback-anonymous"
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(checked === true)}
                data-testid="checkbox-anonymous"
              />
              <Label htmlFor="feedback-anonymous" className="cursor-pointer">
                Send anonymously
              </Label>
            </div>
            <Button
              onClick={handleGiveFeedback}
              disabled={!recipientId || submittingFeedback}
              data-testid="button-submit-feedback"
            >
              <Send />
              {submittingFeedback ? 'Sending...' : 'Send Feedback'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={requestFeedbackOpen}
        onOpenChange={(open) => {
          setRequestFeedbackOpen(open);
          if (!open) resetRequestFeedbackForm();
        }}
      >
        <DialogContent data-testid="dialog-request-feedback">
          <DialogHeader>
            <DialogTitle>Request Feedback</DialogTitle>
            <DialogDescription>Ask a team member for constructive feedback.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="request-responder">From</Label>
              <Select value={responderId} onValueChange={setResponderId}>
                <SelectTrigger
                  className="w-full"
                  data-testid="select-request-responder"
                  id="request-responder"
                >
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem
                      key={emp.id}
                      value={emp.id}
                      data-testid={`select-item-responder-${emp.id}`}
                    >
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="request-prompt">What would you like feedback on?</Label>
              <Textarea
                id="request-prompt"
                placeholder="Describe what you'd like feedback on..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                data-testid="textarea-prompt"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="request-deadline">Deadline</Label>
              <Input
                id="request-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                data-testid="input-deadline"
              />
            </div>
            <Button
              onClick={handleRequestFeedback}
              disabled={!responderId || submittingRequest}
              data-testid="button-submit-request"
            >
              <Send />
              {submittingRequest ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
