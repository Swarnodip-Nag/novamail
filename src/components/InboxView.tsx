import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEmailStore } from "@/hooks/useEmailStore";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Star,
  Inbox,
  AlertCircle,
  ArrowUpDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface InboxViewProps {
  onSelectEmail: (uid: number, accountId: number, folder: string) => void;
  searchQuery: string;
}

export function InboxView({ onSelectEmail, searchQuery }: InboxViewProps) {
  const { user } = useAuth();
  const { currentAccountId, currentFolder } = useEmailStore();
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set());

  const userId = user?.id ?? 0;
  const activeAccountId = currentAccountId ?? 0;

  const {
    data: inboxData,
    isLoading,
    error,
  } = trpc.email.inbox.useQuery(
    {
      accountId: activeAccountId,
      userId,
      folder: currentFolder,
      limit: 50,
      search: searchQuery || undefined,
    },
    {
      enabled: !!activeAccountId && !!userId,
      refetchInterval: 30000,
    }
  );

  const markRead = trpc.email.markRead.useMutation({
    onSuccess: () => {
      utils.email.inbox.invalidate();
    },
  });

  const toggleStarMutation = trpc.email.toggleStar.useMutation({
    onSuccess: () => {
      utils.email.inbox.invalidate();
    },
  });

  const utils = trpc.useUtils();

  const handleSelectEmail = (uid: number) => {
    onSelectEmail(uid, activeAccountId, currentFolder);
    // Mark as read
    markRead.mutate({
      accountId: activeAccountId,
      userId,
      folder: currentFolder,
      uid,
    });
  };

  const handleToggleStar = (e: React.MouseEvent, uid: number, isStarred: boolean) => {
    e.stopPropagation();
    toggleStarMutation.mutate({
      accountId: activeAccountId,
      userId,
      folder: currentFolder,
      uid,
      star: !isStarred,
    });
  };

  const emails = inboxData?.emails || [];

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex h-12 items-center gap-2 border-b border-slate-100 px-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="divide-y divide-slate-50">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-4" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-full" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="h-12 w-12 text-red-300" />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-900">Failed to load emails</p>
          <p className="mt-1 text-xs text-slate-500">
            {error.message || "Check your connection and try again"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => utils.email.inbox.invalidate()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
          <Inbox className="h-8 w-8 text-slate-300" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-900">
            {searchQuery ? "No matching emails" : "No emails in this folder"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {searchQuery
              ? "Try a different search term"
              : "Your inbox is empty"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex h-12 items-center gap-2 border-b border-slate-100 px-4">
        <Checkbox
          checked={selectedEmails.size === emails.length && emails.length > 0}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedEmails(new Set(emails.map((e) => e.uid)));
            } else {
              setSelectedEmails(new Set());
            }
          }}
        />
        <span className="ml-2 text-xs text-slate-500">
          {emails.length} emails
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
            <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-slate-50">
          {emails.map((email) => {
            const isSelected = selectedEmails.has(email.uid);
            const emailDate = email.date
              ? formatDistanceToNow(new Date(email.date), { addSuffix: true })
              : "";

            return (
              <button
                key={email.uid}
                className={cn(
                  "group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                  email.isRead
                    ? "bg-white hover:bg-slate-50"
                    : "bg-blue-50/30 hover:bg-blue-50/60"
                )}
                onClick={() => handleSelectEmail(email.uid)}
              >
                {/* Checkbox */}
                <div
                  className="mt-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      const next = new Set(selectedEmails);
                      if (checked) {
                        next.add(email.uid);
                      } else {
                        next.delete(email.uid);
                      }
                      setSelectedEmails(next);
                    }}
                  />
                </div>

                {/* Star */}
                <button
                  className="mt-0.5 shrink-0"
                  onClick={(e) => handleToggleStar(e, email.uid, email.isStarred)}
                >
                  <Star
                    className={cn(
                      "h-4 w-4 transition-colors",
                      email.isStarred
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300 group-hover:text-slate-400"
                    )}
                  />
                </button>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        email.isRead
                          ? "font-normal text-slate-700"
                          : "font-semibold text-slate-900"
                      )}
                    >
                      {email.from.name || email.from.address}
                    </span>
                    <span
                      className={cn(
                        "truncate text-sm",
                        email.isRead ? "text-slate-500" : "font-medium text-slate-700"
                      )}
                    >
                      {email.subject || "(No Subject)"}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {email.snippet || ""}
                  </p>
                </div>

                {/* Date */}
                <span className="shrink-0 text-[11px] text-slate-400">
                  {emailDate}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
