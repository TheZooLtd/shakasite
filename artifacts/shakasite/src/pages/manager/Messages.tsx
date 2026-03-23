import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useListMessages, useSendMessage, useListWorkers } from '@workspace/api-client-react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ManagerMessages() {
  const { workerId } = useAppContext();
  const { data: allWorkers = [] } = useListWorkers();
  const { data: messages = [], refetch } = useListMessages({ fromWorkerId: workerId ?? undefined });
  const sendMessage = useSendMessage();

  const [selectedTo, setSelectedTo] = useState<number | null>(null);
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);

  const otherWorkers = allWorkers.filter(w => w.id !== workerId);

  const handleSend = async () => {
    if (!workerId || !selectedTo || !body.trim()) return;
    await sendMessage.mutateAsync({ data: { fromWorkerId: workerId, toWorkerId: selectedTo, body: body.trim() } });
    setBody('');
    setSent(true);
    await refetch();
    setTimeout(() => setSent(false), 2000);
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-2xl">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground text-sm mt-1">Send messages to your foremen and workers</p>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="font-semibold text-sm">Compose Message</p>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Send To</label>
              <div className="flex flex-wrap gap-2">
                {otherWorkers.map(w => (
                  <button
                    key={w.id}
                    onClick={() => setSelectedTo(w.id === selectedTo ? null : w.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                      selectedTo === w.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    )}
                  >
                    <User className="w-3.5 h-3.5" />
                    {w.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Message</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={!selectedTo || !body.trim() || sendMessage.isPending}
              className="w-full"
            >
              {sent ? (
                "Message Sent!"
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {messages.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sent Messages</p>
          {messages.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(msg => {
            const toWorker = allWorkers.find(w => w.id === msg.toWorkerId);
            return (
              <Card key={msg.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs font-semibold text-muted-foreground">To: {toWorker?.name ?? 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(msg.createdAt), 'dd MMM, h:mm a')}</p>
                      </div>
                      <p className="text-sm">{msg.body}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
