import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/AppSidebar";
import { InboxView } from "@/components/InboxView";
import { EmailDetail } from "@/components/EmailDetail";
import { ComposeModal } from "@/components/ComposeModal";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { MobileDrawer } from "@/components/MobileDrawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

import {
  Menu,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Toaster } from "sonner";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedEmail, setSelectedEmail] = useState<{
    uid: number;
    accountId: number;
    folder: string;
  } | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyToEmail, setReplyToEmail] = useState<{
    uid: number;
    accountId: number;
    folder: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);


  const utils = trpc.useUtils();

  const handleRefresh = useCallback(() => {
    // Invalidate all email and account queries to refresh the current view
    utils.email.invalidate();
    utils.account.invalidate();
  }, [utils]);

  const handleSelectEmail = useCallback(
    (uid: number, accountId: number, folder: string) => {
      setSelectedEmail({ uid, accountId, folder });
    },
    []
  );

  const handleReply = useCallback(
    (uid: number, accountId: number, folder: string) => {
      setReplyToEmail({ uid, accountId, folder });
      setComposeOpen(true);
    },
    []
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedEmail(null);
  }, []);

  const handleCloseCompose = useCallback(() => {
    setComposeOpen(false);
    setReplyToEmail(null);
  }, []);

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">NovaMail</h1>
          <p className="text-sm text-slate-500">Please log in to access your email</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      <Toaster position="top-right" richColors />

      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <AppSidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center gap-2 border-b border-slate-100 px-3">
          {/* Mobile Menu */}
          <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                <Menu className="h-5 w-5 text-slate-600" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <MobileDrawer />
            </SheetContent>
          </Sheet>

          {/* Search Bar */}
          <div className="relative flex flex-1 items-center">
            <Search className="absolute left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  // Trigger search
                }
              }}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Account Switcher */}
          <AccountSwitcher />

          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 text-slate-500" />
          </Button>

          {/* Compose Button */}
          <Button
            size="sm"
            className="h-9 gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800"
            onClick={() => setComposeOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Compose</span>
          </Button>
        </header>

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {selectedEmail ? (
            <EmailDetail
              accountId={selectedEmail.accountId}
              folder={selectedEmail.folder}
              uid={selectedEmail.uid}
              onBack={handleCloseDetail}
              onReply={handleReply}
            />
          ) : (
            <InboxView
              onSelectEmail={handleSelectEmail}
              searchQuery={searchQuery}
            />
          )}
        </div>
      </div>

      {/* Compose Modal */}
      <ComposeModal
        open={composeOpen}
        onClose={handleCloseCompose}
        replyTo={replyToEmail}
      />
    </div>
  );
}
