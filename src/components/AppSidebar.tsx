import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEmailStore } from "@/hooks/useEmailStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/providers/trpc";
import {
  Inbox,
  Send,
  FileText,
  Trash2,
  Archive,
  Star,
  Mail,
  LogOut,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Plus,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SYSTEM_FOLDERS = [
  { name: "INBOX", displayName: "Inbox", icon: Inbox },
  { name: "Sent", displayName: "Sent", icon: Send },
  { name: "Drafts", displayName: "Drafts", icon: FileText },
  { name: "Starred", displayName: "Starred", icon: Star },
  { name: "Archive", displayName: "Archive", icon: Archive },
  { name: "Trash", displayName: "Trash", icon: Trash2 },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { currentAccountId, currentFolder, setAccount, setFolder } = useEmailStore();
  const [showFolders, setShowFolders] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);

  // Get accounts for user - use hardcoded userId for demo
  const userId = user?.id ?? 0;
  const { data: accounts, isLoading: accountsLoading } = trpc.account.list.useQuery(
    { userId },
    { enabled: !!userId }
  );

  // Auto-select first account if none selected
  const activeAccountId = currentAccountId || accounts?.[0]?.id;

  // Sync to store so other components (InboxView, etc.) see the active account
  useEffect(() => {
    if (!currentAccountId && accounts && accounts.length > 0) {
      setAccount(accounts[0].id);
    }
  }, [currentAccountId, accounts, setAccount]);

  // Get folders for active account
  const { data: folderList, isLoading: foldersLoading } = trpc.account.listFolders.useQuery(
    { id: activeAccountId ?? 0, userId },
    { enabled: !!activeAccountId }
  );

  const handleFolderClick = (folderName: string, displayName: string) => {
    setFolder(folderName, displayName);
  };

  const handleAccountSelect = (accountId: number) => {
    setAccount(accountId);
    setFolder("INBOX", "Inbox");
  };

  return (
    <div className="flex h-screen w-60 flex-col border-r border-slate-100 bg-white">
      {/* App Logo */}
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
          <Mail className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-semibold tracking-tight text-slate-900">NovaMail</span>
      </div>

      <Separator />

      {/* Account Selector */}
      <div className="px-3 py-3">
        <button
          className="flex w-full items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-left transition-colors hover:bg-slate-50"
          onClick={() => setShowAddAccount(!showAddAccount)}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
            {accounts?.find((a) => a.id === activeAccountId)?.name?.charAt(0) || "?"}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-slate-900">
              {accounts?.find((a) => a.id === activeAccountId)?.name || "Select Account"}
            </span>
            <span className="truncate text-[11px] text-slate-500">
              {accounts?.find((a) => a.id === activeAccountId)?.email || ""}
            </span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>

        {/* Account Dropdown */}
        {showAddAccount && (
          <div className="mt-1 rounded-lg border border-slate-100 bg-white py-1 shadow-sm">
            {accounts?.map((account) => (
              <button
                key={account.id}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50",
                  account.id === activeAccountId && "bg-slate-50 font-medium text-slate-900"
                )}
                onClick={() => {
                  handleAccountSelect(account.id);
                  setShowAddAccount(false);
                }}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {account.name.charAt(0)}
                </div>
                <span className="truncate text-slate-700">{account.name}</span>
              </button>
            ))}
            <Separator className="my-1" />
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              onClick={() => setShowAddAccount(false)}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Account</span>
            </button>
          </div>
        )}
      </div>

      <Separator />

      {/* Folders */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          <button
            className="mb-1 flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-600"
            onClick={() => setShowFolders(!showFolders)}
          >
            {showFolders ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Mailboxes
          </button>

          {showFolders && (
            <div className="space-y-0.5">
              {accountsLoading || foldersLoading ? (
                <>
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </>
              ) : folderList && folderList.length > 0 ? (
                folderList.map((folder) => {
                  const Icon = getFolderIcon(folder.name);
                  const isActive = currentFolder === folder.path;

                  return (
                    <button
                      key={folder.path}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                      onClick={() => handleFolderClick(folder.path, folder.name)}
                    >
                      <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400")} />
                      <span className="flex-1 text-left truncate">{folder.name}</span>
                    </button>
                  );
                })
              ) : (
                SYSTEM_FOLDERS.map((folder) => {
                  const Icon = folder.icon;
                  const isActive = currentFolder === folder.name;

                  return (
                    <button
                      key={folder.name}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                      onClick={() => handleFolderClick(folder.name, folder.displayName)}
                    >
                      <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400")} />
                      <span className="flex-1 text-left">{folder.displayName}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* User Profile */}
      <div className="p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name || "User"}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
              {user?.name?.charAt(0) || "U"}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-slate-900">
              {user?.name || "User"}
            </span>
            <span className="truncate text-[11px] text-slate-500">
              {user?.email || ""}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-slate-400 hover:text-slate-600"
            onClick={() => logout()}
            title="Logout"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function getFolderIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("inbox")) return Inbox;
  if (lower.includes("sent")) return Send;
  if (lower.includes("draft")) return FileText;
  if (lower.includes("trash")) return Trash2;
  if (lower.includes("archive")) return Archive;
  if (lower.includes("spam") || lower.includes("junk")) return AlertCircle;
  if (lower.includes("star") || lower.includes("flag")) return Star;
  return FolderOpen;
}
