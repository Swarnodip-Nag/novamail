import { useAuth } from "@/hooks/useAuth";
import { useEmailStore } from "@/hooks/useEmailStore";
import { trpc } from "@/providers/trpc";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Inbox,
  Send,
  FileText,
  Trash2,
  Archive,
  Star,
  FolderOpen,
  AlertCircle,
  LogOut,
  Mail,
  ChevronRight,
} from "lucide-react";

export function MobileDrawer() {
  const { user, logout } = useAuth();
  const { currentAccountId, currentFolder, setFolder } = useEmailStore();

  const userId = user?.id ?? 0;
  const activeAccountId = currentAccountId || 0;

  const { data: accounts } = trpc.account.list.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const { data: folderList } = trpc.account.listFolders.useQuery(
    { id: activeAccountId, userId },
    { enabled: !!activeAccountId }
  );

  const activeAccount = accounts?.find((a) => a.id === activeAccountId);

  const handleFolderClick = (folderPath: string, folderName: string) => {
    setFolder(folderPath, folderName);
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
          <Mail className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-semibold tracking-tight text-slate-900">NovaMail</span>
      </div>

      <Separator />

      {/* Active Account */}
      <div className="px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Active Account
        </p>
        <div className="mt-2 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
            {activeAccount?.name?.charAt(0) || "?"}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-slate-900">
              {activeAccount?.name || "No Account"}
            </span>
            <span className="truncate text-xs text-slate-500">
              {activeAccount?.email || ""}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Folders */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <p className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Mailboxes
          </p>
          <div className="space-y-0.5">
            {folderList && folderList.length > 0 ? (
              folderList.map((folder) => {
                const Icon = getFolderIcon(folder.name);
                const isActive = currentFolder === folder.path;

                return (
                  <button
                    key={folder.path}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                    onClick={() => handleFolderClick(folder.path, folder.name)}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        isActive ? "text-white" : "text-slate-400"
                      )}
                    />
                    <span className="flex-1 text-left">{folder.name}</span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                  </button>
                );
              })
            ) : (
              // Default folders
              <>
                {[
                  { name: "INBOX", displayName: "Inbox", icon: Inbox },
                  { name: "Sent", displayName: "Sent", icon: Send },
                  { name: "Drafts", displayName: "Drafts", icon: FileText },
                  { name: "Starred", displayName: "Starred", icon: Star },
                  { name: "Archive", displayName: "Archive", icon: Archive },
                  { name: "Trash", displayName: "Trash", icon: Trash2 },
                ].map((folder) => {
                  const Icon = folder.icon;
                  const isActive = currentFolder === folder.name;

                  return (
                    <button
                      key={folder.name}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors",
                        isActive
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                      onClick={() => handleFolderClick(folder.name, folder.displayName)}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          isActive ? "text-white" : "text-slate-400"
                        )}
                      />
                      <span className="flex-1 text-left">{folder.displayName}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* User Profile */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name || "User"}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
              {user?.name?.charAt(0) || "U"}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-slate-900">
              {user?.name || "User"}
            </span>
            <span className="truncate text-xs text-slate-500">
              {user?.email || ""}
            </span>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" />
          </button>
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
