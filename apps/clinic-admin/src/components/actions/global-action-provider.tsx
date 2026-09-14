"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { useCreateTask } from "@/components/create-task-drawer";

import { AddCoupleDialog } from "./add-couple-dialog";
import { AddEnquiryDialog } from "./add-enquiry-dialog";
import { NewAppointmentDialog } from "./new-appointment-dialog";
import { StartCycleDialog } from "./start-cycle-dialog";
import { UploadDocumentDialog } from "./upload-document-dialog";

export type GlobalAction =
  | "add-couple"
  | "new-appointment"
  | "create-task"
  | "start-cycle"
  | "upload-document"
  | "add-enquiry";

interface GlobalActions {
  openAction: (action: GlobalAction, options?: { coupleId?: string }) => void;
  closeAction: () => void;
}

const GlobalActionContext = createContext<GlobalActions | null>(null);

export function GlobalActionProvider({ children }: { children: ReactNode }) {
  const { open: openTask } = useCreateTask();
  const [action, setAction] = useState<Exclude<GlobalAction, "create-task"> | null>(null);
  const [coupleId, setCoupleId] = useState<string>();

  const closeAction = useCallback(() => {
    setAction(null);
    setCoupleId(undefined);
  }, []);

  const openAction = useCallback(
    (next: GlobalAction, options?: { coupleId?: string }) => {
      if (next === "create-task") {
        closeAction();
        openTask(options?.coupleId);
        return;
      }
      setCoupleId(options?.coupleId);
      setAction(next);
    },
    [closeAction, openTask],
  );

  const value = useMemo(() => ({ openAction, closeAction }), [closeAction, openAction]);

  return (
    <GlobalActionContext.Provider value={value}>
      {children}
      <AddCoupleDialog
        open={action === "add-couple"}
        onOpenChange={(open) => !open && closeAction()}
      />
      <NewAppointmentDialog
        open={action === "new-appointment"}
        onOpenChange={(open) => !open && closeAction()}
        {...(coupleId ? { coupleId } : {})}
      />
      <StartCycleDialog
        open={action === "start-cycle"}
        onOpenChange={(open) => !open && closeAction()}
        {...(coupleId ? { coupleId } : {})}
      />
      <UploadDocumentDialog
        open={action === "upload-document"}
        onOpenChange={(open) => !open && closeAction()}
        {...(coupleId ? { coupleId } : {})}
      />
      <AddEnquiryDialog
        open={action === "add-enquiry"}
        onOpenChange={(open) => !open && closeAction()}
      />
    </GlobalActionContext.Provider>
  );
}

export function useGlobalActions(): GlobalActions {
  const context = useContext(GlobalActionContext);
  if (!context) throw new Error("useGlobalActions must be used inside GlobalActionProvider");
  return context;
}
