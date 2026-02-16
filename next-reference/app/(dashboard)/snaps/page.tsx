'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Zap, Send, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react';
import { TabBar, type TabDefinition } from '@/components/shared/TabBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonCards } from '@/components/shared/SkeletonCards';
import { getRelativeTime } from '@/lib/utils/date';

interface Snap {
  id: string;
  senderId: string;
  recipientId: string;
  companyId: string;
  message: string;
  tags: string[] | null;
  createdAt: string;
  senderName: string;
  recipientName: string;
}

interface EligibleEmployee {
  id: string;
  name: string;
  email: string;
}

const PREDEFINED_TAGS = [
  'Team Player',
  'Innovation',
  'Leadership',
  'Going Above',
  'Problem Solver',
  'Mentorship',
];

type SnapTab = 'received' | 'sent';

export default function SnapsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const currentUserId = session?.user?.employeeId;

  const [activeTab, setActiveTab] = useState<SnapTab>('received');
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [employees, setEmployees] = useState<EligibleEmployee[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const loading = dataLoading || sessionStatus === 'loading' || !currentUserId;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const receivedSnaps = useMemo(() => {
    if (!currentUserId) return [];
    return snaps.filter((snap) => snap.recipientId === currentUserId);
  }, [snaps, currentUserId]);

  const sentSnaps = useMemo(() => {
    if (!currentUserId) return [];
    return snaps.filter((snap) => snap.senderId === currentUserId);
  }, [snaps, currentUserId]);

  const tabs: TabDefinition<SnapTab>[] = [
    { key: 'received', label: 'Received', count: receivedSnaps.length },
    { key: 'sent', label: 'Sent', count: sentSnaps.length },
  ];

  const fetchSnaps = useCallback(async () => {
    try {
      const res = await fetch('/api/snaps');
      const json = await res.json();
      if (json.success) setSnaps(json.data);
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
    Promise.all([fetchSnaps(), fetchEmployees()]).finally(() =>
      setDataLoading(false)
    );
  }, [fetchSnaps, fetchEmployees]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const resetForm = () => {
    setRecipientId('');
    setMessage('');
    setSelectedTags([]);
  };

  const handleSubmit = async () => {
    if (!recipientId || !message.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/snaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId,
          message: message.trim(),
          tags: selectedTags.length > 0 ? selectedTags : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        resetForm();
        setDialogOpen(false);
        fetchSnaps();
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const activeSnaps = activeTab === 'received' ? receivedSnaps : sentSnaps;

  const renderSnapCard = (snap: Snap) => {
    const isReceived = activeTab === 'received';

    return (
      <Card key={snap.id} data-testid={`card-snap-${snap.id}`}>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {isReceived ? (
              <ArrowDownLeft className="size-4 text-muted-foreground" />
            ) : (
              <ArrowUpRight className="size-4 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">
              {isReceived ? 'From' : 'To'}
            </span>
            <span
              className="font-medium text-sm"
              data-testid={`text-${isReceived ? 'sender' : 'recipient'}-${snap.id}`}
            >
              {isReceived ? snap.senderName : snap.recipientName}
            </span>
          </div>
          <span
            className="text-xs text-muted-foreground"
            data-testid={`text-time-${snap.id}`}
          >
            {getRelativeTime(snap.createdAt)}
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm" data-testid={`text-message-${snap.id}`}>
            {snap.message}
          </p>
          {snap.tags && snap.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {snap.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="no-default-hover-elevate no-default-active-elevate"
                  data-testid={`badge-snap-tag-${snap.id}-${tag.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Zap className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">
            Recognition Snaps
          </h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-send-snap">
              <Plus />
              Send Snap
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-send-snap">
            <DialogHeader>
              <DialogTitle>Send a Recognition Snap</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="recipient-select">
                  Recipient
                </label>
                <Select value={recipientId} onValueChange={setRecipientId}>
                  <SelectTrigger
                    className="w-full"
                    data-testid="select-recipient"
                    id="recipient-select"
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
                <label className="text-sm font-medium" htmlFor="snap-message">
                  Message
                </label>
                <Textarea
                  id="snap-message"
                  placeholder="Write your recognition message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  data-testid="textarea-message"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Tags</span>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_TAGS.map((tag) => (
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
              <Button
                onClick={handleSubmit}
                disabled={!recipientId || !message.trim() || submitting}
                data-testid="button-submit-snap"
              >
                <Send />
                {submitting ? 'Sending...' : 'Send Snap'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {loading ? (
        <SkeletonCards />
      ) : activeSnaps.length === 0 ? (
        <EmptyState
          icon={activeTab === 'received' ? Zap : Send}
          message={
            activeTab === 'received'
              ? 'No recognition snaps received yet. Your team can send you snaps to recognize your work!'
              : 'You haven\'t sent any recognition snaps yet. Be the first to recognize a team member!'
          }
          testId={`empty-state-${activeTab}`}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {activeSnaps.map(renderSnapCard)}
        </div>
      )}
    </div>
  );
}
