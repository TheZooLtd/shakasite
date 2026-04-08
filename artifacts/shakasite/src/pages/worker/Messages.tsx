import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useListMessages, useSendMessage, useListWorkers, getListMessagesQueryKey } from '@workspace/api-client-react';
import type { Message } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, User, ThumbsUp, AlertTriangle, AlertOctagon, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const PRIORITIES = [
  { value: 'normal',  label: 'Normal',  colour: 'bg-secondary text-muted-foreground border-border' },
  { value: 'high',    label: 'High',    colour: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { value: 'urgent',  label: 'Urgent',  colour: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
];

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === 'normal') return null;
  const Icon = priority === 'urgent' ? AlertOctagon : AlertTriangle;
  const cls = priority === 'urgent' ? 'text-rose-400 bg-rose-500/10' : 'text-amber-400 bg-amber-500/10';
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', cls)}>
      <Icon className="w-3 h-3" />
      {priority}
    </span>
  );
}

function ThumbsUpButton({ message, myId, onToggle }: { message: Message; myId: number; onToggle: (id: number) => void }) {
  let thumbsBy: number[] = [];
  try { thumbsBy = JSON.parse(message.thumbsUpBy); } catch {}
  const liked = thumbsBy.includes(myId);
  return (
    <button
      onClick={() => onToggle(message.id)}
      className={cn(
        "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all",
        liked
          ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
          : "bg-transparent text-muted-foreground border-border hover:border-sky-500/30 hover:text-sky-400"
      )}
    >
      <ThumbsUp className={cn("w-3.5 h-3.5 transition-transform", liked && "scale-110")} />
      {thumbsBy.length > 0 && <span>{thumbsBy.length}</span>}
    </button>
  );
}

function MessageCard({ msg, myId, allWorkers, onThumbsUp }: {
  msg: Message;
  myId: number;
  allWorkers: { id: number; name: string }[];
  onThumbsUp: (id: number) => void;
}) {
  const isIncoming = msg.toWorkerId === myId;
  const otherPerson = allWorkers.find(w => w.id === (isIncoming ? msg.fromWorkerId : msg.toWorkerId));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col gap-2 p-4 rounded-2xl border",
        msg.priority === 'urgent'
          ? "bg-rose-500/5 border-rose-500/20"
          : msg.priority === 'high'
          ? "bg-amber-500/5 border-amber-500/15"
          : "bg-card border-border"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
            isIncoming ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
          )}>
            {otherPerson?.name?.[0] ?? '?'}
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              {isIncoming ? `From: ${otherPerson?.name ?? 'Unknown'}` : `To: ${otherPerson?.name ?? 'Unknown'}`}
            </p>
            <p className="text-[10px] text-muted-foreground/60">{format(new Date(msg.createdAt), 'dd MMM, h:mm a')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PriorityBadge priority={msg.priority} />
          <ThumbsUpButton message={msg} myId={myId} onToggle={onThumbsUp} />
        </div>
      </div>
      <p className="text-sm leading-relaxed pl-10">{msg.body}</p>
    </motion.div>
  );
}

export default function WorkerMessages() {
  const { workerId } = useAppContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: allWorkers = [] } = useListWorkers();
  const { data: received = [] } = useListMessages(
    workerId != null ? { toWorkerId: workerId } : {}
  );
  const { data: sent = [] } = useListMessages(
    workerId != null ? { fromWorkerId: workerId } : {}
  );
  const sendMessage = useSendMessage();

  const [tab, setTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [selectedTo, setSelectedTo] = useState<number | null>(null);
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('normal');

  const otherWorkers = allWorkers.filter(w => w.id !== workerId);

  const invalidateMessages = () => queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });

  const handleSend = async () => {
    if (!workerId || !selectedTo || !body.trim()) return;
    try {
      await sendMessage.mutateAsync({
        data: { fromWorkerId: workerId, toWorkerId: selectedTo, body: body.trim(), priority },
      });
      toast({ title: 'Message sent', className: 'bg-success text-success-foreground border-success' });
      setBody('');
      setSelectedTo(null);
      setPriority('normal');
      setTab('sent');
      invalidateMessages();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleThumbsUp = async (messageId: number) => {
    if (!workerId) return;
    try {
      await fetch(`/api/messages/${messageId}/thumbsup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId }),
      });
      await invalidateMessages();
    } catch {}
  };

  const allMessages = [...received, ...sent]
    .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const inboxMessages = received.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const sentMessages = sent.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unreadCount = received.filter(m => !m.isRead).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground text-sm mt-1">Communicate with your team.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-secondary/50 border border-border p-1 rounded-xl w-fit">
        {([
          { key: 'inbox',   label: 'Inbox',   badge: unreadCount },
          { key: 'sent',    label: 'Sent',    badge: 0 },
          { key: 'compose', label: 'Compose', badge: 0 },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative px-4 py-2 text-sm font-semibold rounded-lg transition-all",
              tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            {t.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* INBOX */}
        {tab === 'inbox' && (
          <motion.div key="inbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {inboxMessages.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 border-2 border-dashed border-border rounded-2xl">
                <Inbox className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-muted-foreground">No messages yet.</p>
              </div>
            ) : inboxMessages.map(msg => (
              <MessageCard key={msg.id} msg={msg} myId={workerId!} allWorkers={allWorkers} onThumbsUp={handleThumbsUp} />
            ))}
          </motion.div>
        )}

        {/* SENT */}
        {tab === 'sent' && (
          <motion.div key="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {sentMessages.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 border-2 border-dashed border-border rounded-2xl">
                <MessageSquare className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-muted-foreground">No sent messages yet.</p>
              </div>
            ) : sentMessages.map(msg => (
              <MessageCard key={msg.id} msg={msg} myId={workerId!} allWorkers={allWorkers} onThumbsUp={handleThumbsUp} />
            ))}
          </motion.div>
        )}

        {/* COMPOSE */}
        {tab === 'compose' && (
          <motion.div key="compose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="p-6 space-y-5">
                {/* To */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Send To</label>
                  <div className="flex flex-wrap gap-2">
                    {otherWorkers.map(w => (
                      <button
                        key={w.id}
                        onClick={() => setSelectedTo(w.id === selectedTo ? null : w.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border",
                          selectedTo === w.id
                            ? "bg-primary/15 text-primary border-primary/40"
                            : "bg-secondary text-muted-foreground border-border hover:border-border/80"
                        )}
                      >
                        <User className="w-3.5 h-3.5" />
                        {w.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Priority</label>
                  <div className="flex gap-2">
                    {PRIORITIES.map(p => (
                      <button
                        key={p.value}
                        onClick={() => setPriority(p.value)}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-xl border transition-all",
                          priority === p.value ? p.colour : "bg-transparent text-muted-foreground border-border/50 hover:border-border"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Message</label>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Type your message…"
                    rows={4}
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>

                <Button
                  onClick={handleSend}
                  disabled={!selectedTo || !body.trim() || sendMessage.isPending}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendMessage.isPending ? 'Sending…' : 'Send Message'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
