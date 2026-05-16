import { create } from "zustand";

interface EmailStore {
  currentAccountId: number | null;
  currentFolder: string;
  currentFolderName: string;
  setAccount: (id: number) => void;
  setFolder: (folder: string, name: string) => void;
}

export const useEmailStore = create<EmailStore>((set) => ({
  currentAccountId: null,
  currentFolder: "INBOX",
  currentFolderName: "Inbox",
  setAccount: (id) => set({ currentAccountId: id }),
  setFolder: (folder, name) => set({ currentFolder: folder, currentFolderName: name }),
}));
