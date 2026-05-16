import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Reply,
  Forward,
  Star,
  Archive,
  Trash2,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  MailOpen,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface EmailDetailProps {
  accountId: number;
  folder: string;
  uid: number;
  onBack: () => void;
  onReply: (uid: number, accountId: number, folder: string) => void;
}

export function EmailDetail({
  accountId,
  folder,
  uid,
  onBack,
  onReply,
}: EmailDetailProps) {
  const { user } = useAuth();
  const userId = user?.id ?? 0;
  const [showAiSummary, setShowAiSummary] = useState(false);
  const [showAiReply, setShowAiReply] = useState(false);
  const [replyTone, setReplyTone] = useState<"professional" | "friendly" | "brief">("professional");

  const { data: email, isLoading } = trpc.email.get.useQuery({
    accountId,
    userId,
    folder,
    uid,
  });

  const { data: aiSummary, isLoading: summaryLoading } = trpc.email.aiSummary.useQuery(
    {
      subject: email?.subject || "",
      body: email?.bodyText || email?.bodyHtml || "",
      from: email?.from.address || "",
    },
    { enabled: showAiSummary && !!email }
  );

  const { data: aiReply, isLoading: replyLoading } = trpc.email.aiReply.useQuery(
    {
      subject: email?.subject || "",
      body: email?.bodyText || email?.bodyHtml || "",
      from: email?.from.address || "",
      to: user?.email || "",
      tone: replyTone,
    },
    { enabled: showAiReply && !!email }
  );

  const { data: aiPriority } = trpc.email.aiPriority.useQuery(
    {
      subject: email?.subject || "",
      body: email?.bodyText || email?.bodyHtml || "",
      from: email?.from.address || "",
    },
    { enabled: !!email }
  );

  const toggleStarMutation = trpc.email.toggleStar.useMutation({
    onSuccess: () => {
      utils.email.get.invalidate();
    },
  });

  const archiveMutation = trpc.email.archive.useMutation({
    onSuccess: () => {
      onBack();
    },
  });

  const deleteMutation = trpc.email.delete.useMutation({
    onSuccess: () => {
      onBack();
    },
  });

  const utils = trpc.useUtils();

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-14 items-center gap-2 border-b border-slate-100 px-4">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 flex-1" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="h-12 w-12 text-slate-300" />
        <p className="text-sm text-slate-500">Email not found</p>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    );
  }

  const priorityColor =
    aiPriority?.priority === "high"
      ? "bg-red-50 text-red-700 border-red-200"
      : aiPriority?.priority === "medium"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex h-14 items-center gap-1 border-b border-slate-100 px-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => onReply(uid, accountId, folder)}
          title="Reply"
        >
          <Reply className="h-4 w-4 text-slate-600" />
        </Button>

        <Button variant="ghost" size="icon" className="h-9 w-9" title="Forward">
          <Forward className="h-4 w-4 text-slate-600" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9",
            email.isStarred && "text-amber-500"
          )}
          onClick={() =>
            toggleStarMutation.mutate({
              accountId,
              userId,
              folder,
              uid,
              star: !email.isStarred,
            })
          }
        >
          <Star
            className={cn(
              "h-4 w-4",
              email.isStarred ? "fill-amber-400 text-amber-400" : "text-slate-600"
            )}
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => archiveMutation.mutate({ accountId, userId, folder, uid })}
          title="Archive"
        >
          <Archive className="h-4 w-4 text-slate-600" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 hover:text-red-600"
          onClick={() => deleteMutation.mutate({ accountId, userId, folder, uid })}
          title="Delete"
        >
          <Trash2 className="h-4 w-4 text-slate-600" />
        </Button>

        {aiPriority && (
          <Badge
            variant="outline"
            className={cn("ml-auto mr-2 text-[10px] font-medium", priorityColor)}
          >
            {aiPriority.priority} priority
          </Badge>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6">
          {/* Subject */}
          <h1 className="text-xl font-semibold text-slate-900 leading-tight">
            {email.subject || "(No Subject)"}
          </h1>

          {/* Sender Info */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
              {(email.from.name || email.from.address).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  {email.from.name || email.from.address}
                </span>
                <span className="text-xs text-slate-500">&lt;{email.from.address}&gt;</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                <span>
                  To:{" "}
                  {email.to.map((t) => t.name || t.address).join(", ")}
                </span>
                {email.cc && email.cc.length > 0 && (
                  <span>Cc: {email.cc.map((c) => c.name || c.address).join(", ")}</span>
                )}
              </div>
            </div>
            <span className="shrink-0 text-xs text-slate-400">
              {email.date ? format(new Date(email.date), "MMM d, yyyy h:mm a") : ""}
            </span>
          </div>

          <Separator className="my-4" />

          {/* AI Summary */}
          <div className="mb-4">
            <button
              className="flex w-full items-center gap-2 rounded-lg border border-purple-100 bg-purple-50/50 px-4 py-3 text-left transition-colors hover:bg-purple-50"
              onClick={() => setShowAiSummary(!showAiSummary)}
            >
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-purple-700">AI Summary</span>
              <span className="ml-auto">
                {showAiSummary ? (
                  <ChevronUp className="h-4 w-4 text-purple-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-purple-400" />
                )}
              </span>
            </button>

            {showAiSummary && (
              <div className="mt-2 rounded-lg border border-purple-100 bg-purple-50/30 p-4">
                {summaryLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                    <span className="text-sm text-purple-600">Analyzing email...</span>
                  </div>
                ) : aiSummary ? (
                  <div className="space-y-3">
                    <p className="text-sm leading-relaxed text-slate-700">
                      {aiSummary.summary}
                    </p>
                    {aiSummary.keyPoints.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Key Points
                        </p>
                        <ul className="space-y-1">
                          {aiSummary.keyPoints.map((point, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-slate-600"
                            >
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiSummary.source === "heuristic" && (
                      <p className="text-xs text-slate-400">Generated locally (AI unavailable)</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No summary available</p>
                )}
              </div>
            )}
          </div>

          {/* AI Reply Draft */}
          <div className="mb-4">
            <button
              className="flex w-full items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3 text-left transition-colors hover:bg-blue-50"
              onClick={() => setShowAiReply(!showAiReply)}
            >
              <Sparkles className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700">AI Reply Draft</span>
              <span className="ml-auto">
                {showAiReply ? (
                  <ChevronUp className="h-4 w-4 text-blue-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-blue-400" />
                )}
              </span>
            </button>

            {showAiReply && (
              <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/30 p-4">
                {/* Tone selector */}
                <div className="mb-3 flex gap-2">
                  {(["professional", "friendly", "brief"] as const).map((tone) => (
                    <button
                      key={tone}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                        replyTone === tone
                          ? "bg-blue-100 text-blue-700"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      )}
                      onClick={() => setReplyTone(tone)}
                    >
                      {tone}
                    </button>
                  ))}
                </div>

                {replyLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-sm text-blue-600">Generating draft...</span>
                  </div>
                ) : aiReply ? (
                  <div className="space-y-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {aiReply.draft}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => onReply(uid, accountId, folder)}
                      >
                        <Reply className="mr-1.5 h-3.5 w-3.5" />
                        Use Draft
                      </Button>
                      {aiReply.source === "template" && (
                        <span className="text-xs text-slate-400">Template-based</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No draft available</p>
                )}
              </div>
            )}
          </div>

          {/* Email Body */}
          <div className="prose prose-sm max-w-none">
            {email.bodyHtml ? (
              <div
                className="text-sm leading-relaxed text-slate-700 [&_*]:max-w-full [&_img]:h-auto [&_img]:max-w-full"
                dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
              />
            ) : email.bodyText ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {email.bodyText}
              </p>
            ) : (
              <div className="flex items-center gap-2 py-8 text-slate-400">
                <MailOpen className="h-5 w-5" />
                <span className="text-sm">No content available</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
