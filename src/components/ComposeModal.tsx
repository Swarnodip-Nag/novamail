import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEmailStore } from "@/hooks/useEmailStore";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Send,
  X,
  Loader2,
  Sparkles,
  Minimize2,
  Maximize2,
} from "lucide-react";

interface ComposeModalProps {
  open: boolean;
  onClose: () => void;
  replyTo?: {
    uid: number;
    accountId: number;
    folder: string;
  } | null;
}

export function ComposeModal({ open, onClose, replyTo }: ComposeModalProps) {
  const { user } = useAuth();
  const { currentAccountId } = useEmailStore();
  const userId = user?.id ?? 0;
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const activeAccountId = currentAccountId ?? 0;

  const sendMutation = trpc.email.send.useMutation({
    onSuccess: () => {
      toast.success("Email sent successfully");
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to send: ${error.message}`);
    },
  });

  const replyMutation = trpc.email.reply.useMutation({
    onSuccess: () => {
      toast.success("Reply sent successfully");
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to send reply: ${error.message}`);
    },
  });

  // Get reply email details
  const { data: replyEmail } = trpc.email.get.useQuery(
    {
      accountId: replyTo?.accountId || activeAccountId,
      userId,
      folder: replyTo?.folder || "INBOX",
      uid: replyTo?.uid || 0,
    },
    { enabled: !!replyTo }
  );

  useEffect(() => {
    if (replyTo && replyEmail) {
      setTo(replyEmail.from.address);
      setSubject(
        replyEmail.subject?.startsWith("Re:")
          ? replyEmail.subject
          : `Re: ${replyEmail.subject || ""}`
      );
      setBody(`\n\n--- Original Message ---\nFrom: ${replyEmail.from.name} <${replyEmail.from.address}>\nSubject: ${replyEmail.subject || ""}\n\n${replyEmail.bodyText || ""}`);
    }
  }, [replyTo, replyEmail]);

  const resetForm = () => {
    setTo("");
    setCc("");
    setSubject("");
    setBody("");
    setShowCc(false);
  };

  const handleSend = () => {
    if (!to.trim()) {
      toast.error("Please enter a recipient");
      return;
    }

    if (replyTo) {
      replyMutation.mutate({
        accountId: activeAccountId,
        userId,
        folder: replyTo.folder,
        uid: replyTo.uid,
        bodyText: body,
      });
    } else {
      sendMutation.mutate({
        accountId: activeAccountId,
        userId,
        to,
        cc: cc || undefined,
        subject,
        bodyText: body,
      });
    }
  };

  const isSending = sendMutation.isPending || replyMutation.isPending;

  const sizeClasses = isMaximized
    ? "max-w-4xl h-[90vh]"
    : "max-w-2xl h-[640px]";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={`${sizeClasses} flex flex-col p-0 overflow-hidden`}
      >
        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold text-slate-900">
              {replyTo ? "Reply" : "New Message"}
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400"
                onClick={() => setIsMaximized(!isMaximized)}
              >
                {isMaximized ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Fields */}
        <div className="shrink-0 px-4 py-2 space-y-2">
          <div className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-xs text-slate-500">To</span>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              className="text-xs text-slate-400 hover:text-slate-600"
              onClick={() => setShowCc(!showCc)}
            >
              Cc
            </button>
          </div>

          {showCc && (
            <div className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-xs text-slate-500">Cc</span>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com"
                className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          )}

          <Separator />

          <div className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-xs text-slate-500">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>

          <Separator />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden px-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            className="h-full w-full resize-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 leading-relaxed"
          />
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-slate-900 text-xs text-white hover:bg-slate-800"
              onClick={handleSend}
              disabled={isSending}
            >
              {isSending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {isSending ? "Sending..." : replyTo ? "Send Reply" : "Send"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Discard
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-slate-300" />
            <span className="text-[11px] text-slate-400">
              {body.length} characters
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
