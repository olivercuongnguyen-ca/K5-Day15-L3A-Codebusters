"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ScheduleEvent } from "@/data/mock-schedule";
import {
  DEFAULT_DEMO_USER,
  type DemoUserAccount,
} from "@/data/mock-accounts";
import { Toast, type ToastTone } from "@/components/ui";
import { EventDetailSheet } from "./event-detail-sheet";
import { LeaveRequestSheet } from "./leave-request-sheet";
import { SnakeBottomNav } from "./snake-bottom-nav";

export interface DisplayPreferences {
  showDeadlinesInTimeline: boolean;
  mergeDuplicateSources: boolean;
}

interface AppContextValue {
  currentUser: DemoUserAccount;
  setCurrentUser: (user: DemoUserAccount) => void;
  selectedEvent: ScheduleEvent | null;
  openEventDetail: (event: ScheduleEvent) => void;
  closeEventDetail: () => void;
  openLeaveRequest: (event?: ScheduleEvent) => void;
  showToast: (message: string, tone?: ToastTone) => void;
  preferences: DisplayPreferences;
  updatePreference: <K extends keyof DisplayPreferences>(
    key: K,
    value: DisplayPreferences[K],
  ) => void;
  maskedIcsUrl: string;
  rotateMockIcsUrl: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const MOCK_ICS_SUFFIXES = ["9a4f", "4c2b", "7d18", "3e61"];

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] =
    useState<DemoUserAccount>(DEFAULT_DEMO_USER);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(
    null,
  );
  const [leaveSheetOpen, setLeaveSheetOpen] = useState(false);
  const [leaveTargetEvent, setLeaveTargetEvent] =
    useState<ScheduleEvent | null>(null);
  const [toastState, setToastState] = useState<{
    open: boolean;
    message: string;
    tone: ToastTone;
  }>({
    open: false,
    message: "",
    tone: "info",
  });

  const [preferences, setPreferences] = useState<DisplayPreferences>({
    showDeadlinesInTimeline: true,
    mergeDuplicateSources: true,
  });

  const [icsSuffixIndex, setIcsSuffixIndex] = useState(0);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      setToastState({ open: true, message, tone });
    },
    [],
  );

  const openEventDetail = useCallback((event: ScheduleEvent) => {
    setSelectedEvent(event);
  }, []);

  const closeEventDetail = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  const openLeaveRequest = useCallback((event?: ScheduleEvent) => {
    setSelectedEvent(null);
    setLeaveTargetEvent(event ?? null);
    setLeaveSheetOpen(true);
  }, []);

  const closeLeaveRequest = useCallback(() => {
    setLeaveSheetOpen(false);
  }, []);

  const updatePreference = useCallback(
    <K extends keyof DisplayPreferences>(
      key: K,
      value: DisplayPreferences[K],
    ) => {
      setPreferences((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const rotateMockIcsUrl = useCallback(() => {
    setIcsSuffixIndex((prev) => (prev + 1) % MOCK_ICS_SUFFIXES.length);
  }, []);

  const maskedIcsUrl = `https://unify.edu.vn/ics/••••••••${MOCK_ICS_SUFFIXES[icsSuffixIndex]}.ics`;

  const value = useMemo<AppContextValue>(
    () => ({
      currentUser: currentUser ?? DEFAULT_DEMO_USER,
      setCurrentUser,
      selectedEvent,
      openEventDetail,
      closeEventDetail,
      openLeaveRequest,
      showToast,
      preferences,
      updatePreference,
      maskedIcsUrl,
      rotateMockIcsUrl,
    }),
    [
      currentUser,
      selectedEvent,
      openEventDetail,
      closeEventDetail,
      openLeaveRequest,
      showToast,
      preferences,
      updatePreference,
      maskedIcsUrl,
      rotateMockIcsUrl,
    ],
  );

  return (
    <AppContext.Provider value={value}>
      {children}

      <EventDetailSheet
        event={selectedEvent}
        onClose={closeEventDetail}
        onRequestLeave={openLeaveRequest}
        onDemoAction={(actionLabel) => {
          closeEventDetail();
          showToast(
            `Bản demo — "${actionLabel}" sẽ mở liên kết thật sau khi kết nối tài khoản.`,
            "info",
          );
        }}
      />

      <LeaveRequestSheet
        open={leaveSheetOpen}
        initialEvent={leaveTargetEvent}
        onClose={closeLeaveRequest}
        onToast={showToast}
      />

      <Toast
        open={toastState.open}
        message={toastState.message}
        tone={toastState.tone}
        onClose={() => setToastState((prev) => ({ ...prev, open: false }))}
      />

      <SnakeBottomNav />
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp phải được sử dụng bên trong AppProvider");
  }
  return {
    ...ctx,
    currentUser: ctx.currentUser ?? DEFAULT_DEMO_USER,
  };
}
