"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CalendarSource, ScheduleEvent } from "@/data/mock-schedule";
import type { DemoUserAccount } from "@/data/mock-accounts";
import {
  addDays,
  api,
  dateHeading,
  dm,
  mondayOf,
  post,
  toScheduleEvent,
  todayKey as getTodayKey,
  weekStrip,
  type StaffMe,
  type StudentMe,
  type WeekResponse,
} from "@/lib/backend";
import { Toast, type DateStripItem, type ToastTone } from "@/components/ui";
import { EventDetailSheet } from "./event-detail-sheet";
import { LeaveRequestSheet } from "./leave-request-sheet";
import { MeetingSheet } from "./meeting-sheet";
import { SnakeBottomNav } from "./snake-bottom-nav";

export interface DisplayPreferences {
  showDeadlinesInTimeline: boolean;
  mergeDuplicateSources: boolean;
}

type Identity =
  | { status: "loading" }
  | { status: "none" }
  | { status: "student"; student: StudentMe }
  | { status: "staff"; staff: StaffMe };

/** Real schedule data from the backend, with the same helpers the screens used to import from the mock file. */
export interface ScheduleApi {
  loading: boolean;
  todayKey: string;
  /** "YYYY-MM-DDTHH:MM", updated every minute; "" until the browser knows the time. */
  now: string;
  /** Ended before now (deadlines: due before now). */
  isPast: (event: ScheduleEvent) => boolean;
  /** Started and not yet ended. */
  isOngoing: (event: ScheduleEvent) => boolean;
  todayHeading: string;
  events: ScheduleEvent[];
  latestWeek: WeekResponse | null;
  ensureWeek: (dateKey: string) => void;
  reload: () => void;
  getEventsForDate: (dateKey: string, options?: { includeDeadlines?: boolean }) => ScheduleEvent[];
  getNextUpcomingEvent: () => ScheduleEvent | null;
  getUpcomingDeadlines: () => ScheduleEvent[];
  getDateHeading: (dateKey: string) => string;
  weekDays: (selectedKey: string) => DateStripItem[];
  sources: CalendarSource[];
}

interface AppContextValue {
  identity: Identity;
  currentUser: DemoUserAccount;
  student: StudentMe | null;
  staff: StaffMe | null;
  enterStudent: (studentId: string, squad?: string) => Promise<StudentMe>;
  staffLogin: (username: string, password: string) => Promise<StaffMe>;
  refreshIdentity: () => Promise<void>;
  setStudent: (student: StudentMe) => void;
  logout: () => Promise<void>;
  schedule: ScheduleApi;
  selectedEvent: ScheduleEvent | null;
  openEventDetail: (event: ScheduleEvent) => void;
  closeEventDetail: () => void;
  openLeaveRequest: (event?: ScheduleEvent) => void;
  openMeetingSheet: () => void;
  showToast: (message: string, tone?: ToastTone) => void;
  preferences: DisplayPreferences;
  updatePreference: <K extends keyof DisplayPreferences>(key: K, value: DisplayPreferences[K]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);
const PUBLIC_PATHS = ["/login", "/offline", "/design-system"];

function initialsOf(text: string) {
  const parts = text.replace(/\./g, " ").trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : text.slice(0, 2)).toUpperCase();
}

function toAccount(identity: Identity): DemoUserAccount {
  if (identity.status === "student") {
    const s = identity.student;
    const short = s.short_name || s.student_id;
    return {
      id: s.student_id, role: "student", roleLabel: "Học viên", studentCode: s.student_id, email: "",
      name: s.short_name ? `${s.short_name}` : `Học viên ${s.student_id}`, shortName: s.short_name || "bạn",
      subtitle: `Lớp ${s.class}${s.team ? ` · ${s.team}` : ""}${s.squad ? ` · Team ${s.squad}` : ""}`, initials: initialsOf(short),
    };
  }
  if (identity.status === "staff") {
    const u = identity.staff;
    return {
      id: String(u.id), role: u.role, roleLabel: u.role === "admin" ? "Admin" : "Mentor", email: u.username,
      name: u.display_name, shortName: u.display_name.split(" ").slice(-1)[0] || u.username,
      subtitle: u.role === "mentor" ? (u.teams.join(", ") || "Chưa gán nhóm") : "Ban đào tạo", initials: initialsOf(u.display_name),
    };
  }
  return { id: "", role: "student", roleLabel: "Khách", email: "", name: "Chưa đăng nhập", shortName: "bạn",
    subtitle: "", initials: "?" };
}

// "today" is read from the clock in the browser only (never during the server render), and re-read every minute.
function subscribeMinute(onChange: () => void) {
  const t = setInterval(onChange, 60_000);
  return () => clearInterval(t);
}
const serverToday = () => "";
/** "2026-11-28T14:05" in local (Vietnam) time; changes once a minute, so it is a stable snapshot. */
function getNowKey() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${getTodayKey()}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Who is using this browser: a student (ID cookie), a signed-in staff member, or nobody yet. */
async function resolveIdentity(): Promise<Identity> {
  try {
    return { status: "student", student: await api<StudentMe>("/api/student/me") };
  } catch { /* not a student on this device */ }
  try {
    return { status: "staff", staff: await api<StaffMe>("/api/auth/me") };
  } catch {
    return { status: "none" };
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [identity, setIdentity] = useState<Identity>({ status: "loading" });
  const [weeks, setWeeks] = useState<Record<string, WeekResponse>>({});
  const pending = useRef(new Set<string>());
  const [loadingCount, setLoadingCount] = useState(0);
  const today = useSyncExternalStore(subscribeMinute, getTodayKey, serverToday);
  const nowKey = useSyncExternalStore(subscribeMinute, getNowKey, serverToday);

  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [leaveSheetOpen, setLeaveSheetOpen] = useState(false);
  const [leaveTargetEvent, setLeaveTargetEvent] = useState<ScheduleEvent | null>(null);
  const [meetingSheetOpen, setMeetingSheetOpen] = useState(false);
  const [toastState, setToastState] = useState<{ open: boolean; message: string; tone: ToastTone }>({
    open: false, message: "", tone: "info",
  });
  const [preferences, setPreferences] = useState<DisplayPreferences>({
    showDeadlinesInTimeline: true, mergeDuplicateSources: true,
  });

  const showToast = useCallback((message: string, tone: ToastTone = "info") => {
    setToastState({ open: true, message, tone });
  }, []);

  // ---------- identity ----------
  const refreshIdentity = useCallback(async () => setIdentity(await resolveIdentity()), []);

  useEffect(() => {
    let alive = true;
    resolveIdentity().then((id) => { if (alive) setIdentity(id); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (identity.status === "none" && !PUBLIC_PATHS.some((p) => pathname.startsWith(p))) router.replace("/login");
  }, [identity.status, pathname, router]);

  const enterStudent = useCallback(async (studentId: string, squad?: string) => {
    const me = await post<StudentMe>("/api/student/enter", { student_id: studentId, squad: squad ?? "" });
    const full = await api<StudentMe>("/api/student/me").catch(() => me);
    setWeeks({}); pending.current.clear();
    setIdentity({ status: "student", student: full });
    return full;
  }, []);

  const staffLogin = useCallback(async (username: string, password: string) => {
    const me = await post<StaffMe>("/api/auth/login", { username, password });
    setIdentity({ status: "staff", staff: me });
    return me;
  }, []);

  const logout = useCallback(async () => {
    await post("/api/student/exit", {}).catch(() => undefined);
    await post("/api/auth/logout", {}).catch(() => undefined);
    setWeeks({}); pending.current.clear();
    setIdentity({ status: "none" });
    router.replace("/login");
  }, [router]);

  const setStudent = useCallback((student: StudentMe) => setIdentity({ status: "student", student }), []);

  // ---------- schedule ----------
  const ensureWeek = useCallback((dateKey: string) => {
    if (identity.status !== "student") return;
    const monday = mondayOf(dateKey);
    if (weeks[monday] || pending.current.has(monday)) return;
    pending.current.add(monday);
    setLoadingCount((n) => n + 1);
    api<WeekResponse>(`/api/week?monday=${monday}`)
      .then((w) => setWeeks((prev) => ({ ...prev, [monday]: w })))
      .catch((err: Error) => showToast(err.message, "danger"))
      .finally(() => { pending.current.delete(monday); setLoadingCount((n) => n - 1); });
  }, [identity.status, weeks, showToast]);

  const reload = useCallback(() => { setWeeks({}); pending.current.clear(); }, []);

  useEffect(() => {
    if (identity.status !== "student" || !today) return;
    ensureWeek(today);
    ensureWeek(addDays(today, 7));  // deadlines and suggestions often fall next week
  }, [identity.status, today, ensureWeek, weeks]);

  const events = useMemo(() => {
    const seen = new Set<string>();
    const out: ScheduleEvent[] = [];
    for (const w of Object.values(weeks)) {
      for (const item of w.items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        out.push(toScheduleEvent(item, w));
      }
    }
    return out.sort((a, b) => (a.dateKey + a.startTime).localeCompare(b.dateKey + b.startTime));
  }, [weeks]);

  const latestWeek = weeks[mondayOf(today)] ?? Object.values(weeks)[0] ?? null;

  const schedule = useMemo<ScheduleApi>(() => {
    const sources: CalendarSource[] = latestWeek ? [
      {
        id: "outlook", name: "Thời khoá biểu (email)", description: "Lịch học và phòng từ email ban đào tạo gửi hằng tuần",
        status: latestWeek.tkb_version ? "connected" : "disconnected",
        statusLabel: latestWeek.tkb_version ? "Đã có" : "Chưa có",
        lastUpdatedLabel: latestWeek.tkb_version
          ? `Bản ngày ${dm(latestWeek.tkb_version.received_at.slice(0, 10))} lúc ${latestWeek.tkb_version.received_at.slice(11, 16)}`
          : "Chưa có thời khoá biểu", actionLabel: "Xem",
      },
      {
        id: "phoenix", name: "Phoenix", description: "Workshop, office hour, mentor duty và hạn nộp của riêng bạn",
        status: latestWeek.phoenix_linked ? "connected" : "disconnected",
        statusLabel: latestWeek.phoenix_linked ? "Đã kết nối" : "Chưa kết nối",
        lastUpdatedLabel: latestWeek.phoenix_synced_at
          ? `Đồng bộ ${dm(latestWeek.phoenix_synced_at.slice(0, 10))} lúc ${latestWeek.phoenix_synced_at.slice(11, 16)} · tự cập nhật mỗi giờ`
          : "Dán link lịch Phoenix để kết nối", actionLabel: latestWeek.phoenix_linked ? "Đổi link" : "Kết nối",
      },
    ] : [];
    return {
      loading: loadingCount > 0,
      todayKey: today,
      now: nowKey,
      isPast: (e) => Boolean(nowKey) && `${e.dateKey}T${e.category === "deadline" ? e.startTime : e.endTime}` <= nowKey,
      isOngoing: (e) => Boolean(nowKey) && e.category !== "deadline"
        && `${e.dateKey}T${e.startTime}` <= nowKey && nowKey < `${e.dateKey}T${e.endTime}`,
      todayHeading: today ? dateHeading(today, "") : "",
      events,
      latestWeek,
      ensureWeek,
      reload,
      getEventsForDate: (dateKey, options) => events.filter((e) =>
        e.dateKey === dateKey && ((options?.includeDeadlines ?? true) || e.category !== "deadline")),
      getNextUpcomingEvent: () => {
        if (!today) return null;  // server render: no clock
        const now = nowKey;
        return events.find((e) => e.category !== "deadline" && !e.cancelled && `${e.dateKey}T${e.endTime}` > now) ?? null;
      },
      getUpcomingDeadlines: () => {
        if (!today) return [];
        const now = nowKey;
        const seen = new Set<string>();
        return events.filter((e) => e.category === "deadline" && `${e.dateKey}T${e.startTime}` > now)
          .filter((e) => !seen.has(e.title) && Boolean(seen.add(e.title)));
      },
      getDateHeading: (dateKey) => (dateKey ? dateHeading(dateKey, today) : ""),
      weekDays: (selectedKey) => (selectedKey ? weekStrip(selectedKey, events, today) : []),
      sources,
    };
  }, [events, latestWeek, loadingCount, today, nowKey, ensureWeek, reload]);

  // ---------- sheets ----------
  const openEventDetail = useCallback((event: ScheduleEvent) => setSelectedEvent(event), []);
  const closeEventDetail = useCallback(() => setSelectedEvent(null), []);
  const openLeaveRequest = useCallback((event?: ScheduleEvent) => {
    setSelectedEvent(null);
    setLeaveTargetEvent(event ?? null);
    setLeaveSheetOpen(true);
  }, []);
  const openMeetingSheet = useCallback(() => setMeetingSheetOpen(true), []);

  const updatePreference = useCallback(<K extends keyof DisplayPreferences>(key: K, value: DisplayPreferences[K]) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  }, []);

  const student = identity.status === "student" ? identity.student : null;
  const staff = identity.status === "staff" ? identity.staff : null;

  const value = useMemo<AppContextValue>(() => ({
    identity, currentUser: toAccount(identity), student, staff, enterStudent, staffLogin, refreshIdentity, setStudent,
    logout, schedule, selectedEvent, openEventDetail, closeEventDetail, openLeaveRequest, openMeetingSheet, showToast,
    preferences, updatePreference,
  }), [identity, student, staff, enterStudent, staffLogin, refreshIdentity, setStudent, logout, schedule, selectedEvent,
    openEventDetail, closeEventDetail, openLeaveRequest, openMeetingSheet, showToast, preferences, updatePreference]);

  function primaryAction(event: ScheduleEvent | null) {
    closeEventDetail();
    if (!event) return;
    if (event.joinUrl) window.open(event.joinUrl, "_blank", "noopener,noreferrer");
    else if (event.category === "session") openLeaveRequest(event);
  }

  return (
    <AppContext.Provider value={value}>
      {children}

      <EventDetailSheet
        event={selectedEvent}
        onClose={closeEventDetail}
        onRequestLeave={openLeaveRequest}
        onDemoAction={(actionLabel) => {
          if (selectedEvent && actionLabel === selectedEvent.ctaLabel) return primaryAction(selectedEvent);
          closeEventDetail();
          showToast(selectedEvent?.sources.includes("Phoenix") ? "Nguồn: lịch Phoenix của bạn, cập nhật mỗi giờ."
            : selectedEvent?.sources.includes("Team") ? "Nguồn: lịch họp do team bạn đặt trong app."
              : "Nguồn: thời khoá biểu ban đào tạo gửi qua email.", "info");
        }}
      />

      <LeaveRequestSheet
        open={leaveSheetOpen}
        initialEvent={leaveTargetEvent}
        onClose={() => setLeaveSheetOpen(false)}
        onToast={showToast}
      />

      <MeetingSheet open={meetingSheetOpen} onClose={() => setMeetingSheetOpen(false)} />

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

/**
 * False on the server and on a component's first client render, true once it has mounted. Screens that show the
 * signed-in student's data render it only then: the provider (in the layout) may already hold browser-only values
 * (today's date, identity, schedule) by the time a page segment hydrates, which would not match the server HTML.
 */
export function useHydrated() {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the one place a mount flag is the point
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp phải được sử dụng bên trong AppProvider");
  return ctx;
}
