import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AlertsState {
  dismissedAlertIds: string[];
  dismissAlert: (id: string) => void;
  clearDismissed: () => void;
  isAlertDismissed: (id: string) => boolean;
}

export const useAlertsStore = create<AlertsState>()(
  persist(
    (set, get) => ({
      dismissedAlertIds: [],
      dismissAlert: (id) =>
        set((s) => ({
          dismissedAlertIds: s.dismissedAlertIds.includes(id)
            ? s.dismissedAlertIds
            : [...s.dismissedAlertIds, id],
        })),
      clearDismissed: () => set({ dismissedAlertIds: [] }),
      isAlertDismissed: (id) => get().dismissedAlertIds.includes(id),
    }),
    {
      name: "mawazin-dismissed-alerts",
    }
  )
);
