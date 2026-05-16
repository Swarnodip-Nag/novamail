import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEmailStore } from "@/hooks/useEmailStore";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ChevronDown,
  Plus,
  Trash2,
  Mail,
  Check,
  Loader2,
} from "lucide-react";

export function AccountSwitcher() {
  const { user } = useAuth();
  const { currentAccountId, setAccount } = useEmailStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const userId = user?.id ?? 0;

  const { data: accounts, isLoading } = trpc.account.list.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const createAccount = trpc.account.create.useMutation({
    onSuccess: () => {
      toast.success("Account added successfully");
      utils.account.list.invalidate();
      setAddDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to add account: ${error.message}`);
    },
  });

  const deleteAccount = trpc.account.delete.useMutation({
    onSuccess: () => {
      toast.success("Account removed");
      utils.account.list.invalidate();
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(`Failed to remove: ${error.message}`);
    },
  });

  const utils = trpc.useUtils();

  const activeAccount = accounts?.find((a) => a.id === (currentAccountId || accounts[0]?.id));

  const handleSelect = (accountId: number) => {
    setAccount(accountId);
    setDropdownOpen(false);
  };

  return (
    <>
      {/* Dropdown Trigger */}
      <div className="relative">
        <button
          className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
            {activeAccount?.name?.charAt(0) || "?"}
          </div>
          <span className="hidden sm:inline max-w-[100px] truncate">
            {activeAccount?.name || "Account"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-slate-100 bg-white py-1 shadow-lg">
              <div className="px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Email Accounts
                </p>
              </div>

              {isLoading ? (
                <div className="px-3 py-4 text-center text-sm text-slate-400">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Loading...
                </div>
              ) : accounts && accounts.length > 0 ? (
                accounts.map((account) => (
                  <div
                    key={account.id}
                    className="group flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-slate-50"
                  >
                    <button
                      className="flex flex-1 items-center gap-2.5 text-left"
                      onClick={() => handleSelect(account.id)}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {account.name.charAt(0)}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium text-slate-900">
                          {account.name}
                        </span>
                        <span className="truncate text-[11px] text-slate-500">
                          {account.email}
                        </span>
                      </div>
                      {(currentAccountId || accounts[0]?.id) === account.id && (
                        <Check className="h-4 w-4 text-slate-600" />
                      )}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500"
                      onClick={() => setDeleteConfirm(account.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-center">
                  <Mail className="mx-auto mb-2 h-8 w-8 text-slate-200" />
                  <p className="text-sm text-slate-500">No accounts configured</p>
                </div>
              )}

              <Separator className="my-1" />
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
                onClick={() => {
                  setDropdownOpen(false);
                  setAddDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add Account
              </button>
            </div>
          </>
        )}
      </div>

      {/* Add Account Dialog */}
      <AddAccountDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={(data) => createAccount.mutate({ userId, ...data })}
        isLoading={createAccount.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Remove Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            Are you sure you want to remove this account? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteConfirm !== null) {
                  deleteAccount.mutate({ id: deleteConfirm, userId });
                }
              }}
              disabled={deleteAccount.isPending}
            >
              {deleteAccount.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Add Account Dialog ──────────────────────────────────────────
interface AddAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: {
    name: string;
    email: string;
    provider: "gmail" | "microsoft365" | "imap";
    authType: "oauth" | "password";
    imapHost?: string;
    imapPort?: number;
    imapUsername?: string;
    imapPassword?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUsername?: string;
    smtpPassword?: string;
  }) => void;
  isLoading: boolean;
}

function AddAccountDialog({ open, onClose, onAdd, isLoading }: AddAccountDialogProps) {
  const [step, setStep] = useState<"select" | "form">("select");
  const [provider, setProvider] = useState<"gmail" | "microsoft365" | "imap">("imap");
  const [authType, setAuthType] = useState<"oauth" | "password">("password");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState(993);
  const [imapUsername, setImapUsername] = useState("");
  const [imapPassword, setImapPassword] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");

  const handleProviderSelect = (p: "gmail" | "microsoft365" | "imap") => {
    setProvider(p);
    setAuthType(p === "imap" ? "password" : "oauth");

    // Pre-fill defaults
    if (p === "gmail") {
      setImapHost("imap.gmail.com");
      setImapPort(993);
      setSmtpHost("smtp.gmail.com");
      setSmtpPort(587);
    } else if (p === "microsoft365") {
      setImapHost("outlook.office365.com");
      setImapPort(993);
      setSmtpHost("smtp.office365.com");
      setSmtpPort(587);
    }

    setStep("form");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      name,
      email,
      provider,
      authType,
      imapHost: imapHost || undefined,
      imapPort: imapPort || undefined,
      imapUsername: imapUsername || undefined,
      imapPassword: imapPassword || undefined,
      smtpHost: smtpHost || undefined,
      smtpPort: smtpPort || undefined,
      smtpUsername: smtpUsername || undefined,
      smtpPassword: smtpPassword || undefined,
    });
  };

  const reset = () => {
    setStep("select");
    setProvider("imap");
    setAuthType("password");
    setName("");
    setEmail("");
    setImapHost("");
    setImapPort(993);
    setImapUsername("");
    setImapPassword("");
    setSmtpHost("");
    setSmtpPort(587);
    setSmtpUsername("");
    setSmtpPassword("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {step === "select" ? "Add Email Account" : "Account Details"}
          </DialogTitle>
        </DialogHeader>

        {step === "select" ? (
          <div className="grid gap-3">
            <button
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
              onClick={() => handleProviderSelect("gmail")}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <Mail className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Gmail</p>
                <p className="text-xs text-slate-500">Google Workspace or personal</p>
              </div>
            </button>

            <button
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
              onClick={() => handleProviderSelect("microsoft365")}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Microsoft 365</p>
                <p className="text-xs text-slate-500">Outlook, Office 365</p>
              </div>
            </button>

            <button
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
              onClick={() => handleProviderSelect("imap")}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <Mail className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Other IMAP</p>
                <p className="text-xs text-slate-500">Yahoo, AOL, custom provider</p>
              </div>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Display Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Work Email"
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-9 text-sm"
              />
            </div>

            {provider !== "imap" && (
              <div className="space-y-2">
                <Label className="text-xs">Authentication</Label>
                <Select
                  value={authType}
                  onValueChange={(v) => setAuthType(v as "oauth" | "password")}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oauth">OAuth (Recommended)</SelectItem>
                    <SelectItem value="password">App Password</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(authType === "password" || provider === "imap") && (
              <>
                <Separator />
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  IMAP Settings
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">IMAP Server</Label>
                    <Input
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                      placeholder="imap.example.com"
                      required
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Port</Label>
                    <Input
                      type="number"
                      value={imapPort}
                      onChange={(e) => setImapPort(Number(e.target.value))}
                      required
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Username</Label>
                    <Input
                      value={imapUsername}
                      onChange={(e) => setImapUsername(e.target.value)}
                      placeholder={email || "user@example.com"}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Password</Label>
                    <Input
                      type="password"
                      value={imapPassword}
                      onChange={(e) => setImapPassword(e.target.value)}
                      required
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <Separator />
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  SMTP Settings
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">SMTP Server</Label>
                    <Input
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.example.com"
                      required
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Port</Label>
                    <Input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      required
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setStep("select")}
              >
                Back
              </Button>
              <Button
                type="submit"
                size="sm"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 h-4 w-4" />
                )}
                Add Account
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

