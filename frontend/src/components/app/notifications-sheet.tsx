"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, post } from "@/lib/backend";
import { cn } from "@/lib/cn";
import {
  Badge,
  BellIcon,
  Button,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  RefreshIcon,
  Sheet,
  type BadgeVariant,
} from "@/components/ui";
import { useApp } from "./app-provider";

export type NotificationKind =
  | "time_change"
  | "room_change"
  | "duty_change"
  | "duty_cancelled"
  | "tkb_update";

export interface StudentNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  session_id?: string | null;
  date_key?: string | null;
}

const KIND_BADGE: Record<NotificationKind, { label: string; variant: BadgeVariant }> = {
  time_change: { label: "Đổi giờ học", variant: "warning" },
  room_change: { label: "Đổi phòng", variant: "warning" },
  duty_change: { label: "Mentor duty", variant: "secondary" },
  duty_cancelled: { label: "Hủy ca", variant: "danger" },
  tkb_update: { label: "TKB mới", variant: "info" },
};

function formatShortTime(at: string): string {
  if (!at || at.length < 16) return "";
  const d = at.slice(8, 10);
  const m = at.slice(5, 7);
  const hm = at.slice(11, 16);
  return `${d}/${m} · ${hm}`;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function readSeenIds(storageKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeSeenIds(storageKey: string, ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(ids.slice(0, 100)));
  } catch {
    // ignore storage quota errors
  }
}

export function useStudentNotifications() {
  const { student, schedule, showToast } = useApp();
  const studentId = student?.student_id ?? "";
  const storageKey = studentId ? `unify:seen-notifs:${studentId}` : "";

  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const knownIdsRef = useRef<Set<string> | null>(null);
  const reloadRef = useRef(schedule.reload);
  const showToastRef = useRef(showToast);

  useEffect(() => {
    reloadRef.current = schedule.reload;
    showToastRef.current = showToast;
  }, [schedule.reload, showToast]);

  const fetchNotifications = useCallback(
    async (silent = false) => {
      if (!studentId) return;
      if (!silent) setLoading(true);
      try {
        const res = await api<{ notifications: StudentNotification[] }>(
          "/api/student/notifications",
        );
        const list = res.notifications ?? [];
        setNotifications(list);

        if (knownIdsRef.current === null) {
          knownIdsRef.current = new Set(list.map((n) => n.id));
        } else {
          const fresh = list.filter((n) => !knownIdsRef.current!.has(n.id));
          if (fresh.length > 0) {
            fresh.forEach((n) => knownIdsRef.current!.add(n.id));
            const first = fresh[0];
            showToastRef.current(
              `${first.title} — ${first.body}`,
              first.kind === "duty_cancelled" ? "danger" : "warning",
            );
            reloadRef.current();
          }
        }
      } catch {
        // silent fail on background poll
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [studentId],
  );

  useEffect(() => {
    knownIdsRef.current = null;
    if (!studentId) return;

    const raf = window.requestAnimationFrame(() => {
      setSeenIds(readSeenIds(storageKey));
      void fetchNotifications(false);
    });

    const interval = window.setInterval(() => {
      void fetchNotifications(true);
    }, 30_000);

    const onFocus = () => {
      void fetchNotifications(true);
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [studentId, storageKey, fetchNotifications]);

  const seenSet = useMemo(() => new Set(seenIds), [seenIds]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !seenSet.has(n.id)).length,
    [notifications, seenSet],
  );

  const markRead = useCallback(
    (id: string) => {
      if (!storageKey) return;
      setSeenIds((prev) => {
        if (prev.includes(id)) return prev;
        const next = [id, ...prev];
        writeSeenIds(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const markAllRead = useCallback(() => {
    if (!storageKey) return;
    const allIds = Array.from(new Set([...notifications.map((n) => n.id), ...seenIds]));
    setSeenIds(allIds);
    writeSeenIds(storageKey, allIds);
  }, [notifications, seenIds, storageKey]);

  return {
    notifications,
    unreadCount,
    seenSet,
    loading,
    refresh: () => void fetchNotifications(false),
    markRead,
    markAllRead,
  };
}

export interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: StudentNotification[];
  unreadCount: number;
  seenSet: Set<string>;
  loading: boolean;
  onRefresh: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSelectDate?: (dateKey: string) => void;
}

export interface PushPrefs {
  class_minutes: 15 | 30 | 60;
  remind_duty: boolean;
  remind_meeting: boolean;
  remind_deadline: boolean;
}

const DEFAULT_PUSH_PREFS: PushPrefs = {
  class_minutes: 60,
  remind_duty: true,
  remind_meeting: true,
  remind_deadline: true,
};

const REMINDER_MINUTES: (15 | 30 | 60)[] = [15, 30, 60];

export function NotificationsSheet({
  open,
  onOpenChange,
  notifications,
  unreadCount,
  seenSet,
  loading,
  onRefresh,
  onMarkRead,
  onMarkAllRead,
  onSelectDate,
}: NotificationsSheetProps) {
  const { schedule, openEventDetail, showToast } = useApp();
  const [pushState, setPushState] = useState<
    "idle" | "subscribed" | "unsupported" | "no_vapid" | "denied"
  >("idle");
  const [pushBusy, setPushBusy] = useState(false);
  const [prefs, setPrefs] = useState<PushPrefs>(DEFAULT_PUSH_PREFS);
  const [prefsSaving, setPrefsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;

    async function loadPrefs() {
      try {
        const res = await api<PushPrefs>("/api/push/prefs");
        if (alive && res) setPrefs(res);
      } catch {
        // keep defaults
      }
    }

    async function checkPush() {
      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        if (alive) setPushState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (alive) setPushState("denied");
        return;
      }
      try {
        const keyRes = await api<{ key?: string }>("/api/push/key");
        if (!keyRes.key) {
          if (alive) setPushState("no_vapid");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (alive) setPushState(sub ? "subscribed" : "idle");
      } catch {
        if (alive) setPushState("no_vapid");
      }
    }

    void loadPrefs();
    void checkPush();
    return () => {
      alive = false;
    };
  }, [open]);

  async function handleUpdatePrefs(patch: Partial<PushPrefs>) {
    const next: PushPrefs = { ...prefs, ...patch };
    setPrefs(next);
    setPrefsSaving(true);
    try {
      const saved = await post<PushPrefs>("/api/push/prefs", next, "PUT");
      setPrefs(saved);
      showToast(`Đã lưu nhắc hẹn trước ${saved.class_minutes} phút.`, "success");
    } catch (err) {
      setPrefs(prefs);
      showToast((err as Error).message || "Không lưu được cài đặt nhắc hẹn.", "danger");
    } finally {
      setPrefsSaving(false);
    }
  }

  async function handleEnablePush() {
    setPushBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPushState("denied");
        showToast("Trình duyệt chưa cấp quyền hiển thị thông báo.", "warning");
        return;
      }
      const keyRes = await api<{ key?: string }>("/api/push/key");
      if (!keyRes.key) {
        setPushState("no_vapid");
        showToast("Máy chủ chưa cấu hình khóa VAPID cho thông báo đẩy.", "info");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyRes.key),
      });
      await post("/api/push/subscribe", { sub: sub.toJSON() });
      setPushState("subscribed");
      showToast("Đã bật thông báo đẩy khi lịch học hoặc phòng học thay đổi.", "success");
    } catch (err) {
      showToast((err as Error).message || "Không thể bật thông báo đẩy.", "danger");
    } finally {
      setPushBusy(false);
    }
  }

  async function handleTestPush() {
    setPushBusy(true);
    try {
      const res = await post<{ sent: number }>("/api/push/test", {});
      if (res.sent > 0) {
        showToast("Đã gửi thông báo thử tới thiết bị này.", "success");
      } else {
        showToast("Không gửi được thông báo thử. Hãy thử tắt/bật lại thông báo đẩy.", "warning");
      }
    } catch (err) {
      showToast((err as Error).message, "danger");
    } finally {
      setPushBusy(false);
    }
  }

  function handleNotificationClick(n: StudentNotification) {
    onMarkRead(n.id);
    if (n.date_key) {
      schedule.ensureWeek(n.date_key);
      onSelectDate?.(n.date_key);
    }
    if (n.session_id) {
      const matched = schedule.events.find((e) => e.id === n.session_id);
      if (matched) {
        onOpenChange(false);
        openEventDetail(matched);
        return;
      }
    }
    if (n.date_key) {
      onOpenChange(false);
    }
  }

  return (
    <Sheet
      open={open}
      placement="drawer"
      size="sm"
      onOpenChange={onOpenChange}
      title="Thông báo thay đổi lịch"
      subtitle="Cập nhật tự động khi đổi giờ học, đổi phòng, đổi ca trực hoặc có TKB mới"
      headerBadge={
        <>
          <Badge variant="secondary">Thông báo</Badge>
          {unreadCount > 0 ? (
            <Badge variant="warning">{unreadCount} chưa đọc</Badge>
          ) : (
            <Badge variant="success">Đã xem hết</Badge>
          )}
        </>
      }
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshIcon size={14} />}
            loading={loading}
            onClick={onRefresh}
          >
            Làm mới
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<CheckCircleIcon size={14} />}
            disabled={unreadCount === 0}
            onClick={onMarkAllRead}
          >
            Đánh dấu đã đọc
          </Button>
        </div>
      }
    >
      {/* Web Push Status Card */}
      <div className="p-3.5 rounded-[16px] bg-surface-subtle border border-border flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-text-primary">
            <BellIcon size={15} className="text-secondary" />
            Thông báo đẩy trên thiết bị
          </span>
          {pushState === "subscribed" ? (
            <Badge variant="success" dot size="sm">
              Đang bật
            </Badge>
          ) : null}
        </div>

        {pushState === "idle" ? (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[12px] text-text-secondary">
              Nhận cảnh báo ngay cả khi không mở trình duyệt.
            </p>
            <Button
              variant="primary"
              size="sm"
              loading={pushBusy}
              onClick={() => void handleEnablePush()}
            >
              Bật thông báo đẩy
            </Button>
          </div>
        ) : pushState === "subscribed" ? (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[12px] text-text-secondary">
              Thiết bị này sẽ nhận thông báo khi phòng hoặc giờ học thay đổi.
            </p>
            <Button
              variant="outline"
              size="sm"
              loading={pushBusy}
              onClick={() => void handleTestPush()}
            >
              Gửi thử
            </Button>
          </div>
        ) : (
          <p className="text-[12px] leading-[17px] text-text-secondary">
            {pushState === "denied"
              ? "Trình duyệt đang chặn quyền thông báo. Bạn vẫn nhận đầy đủ thông báo trực tiếp trong ứng dụng."
              : "Thông báo trong ứng dụng tự động cập nhật mỗi 30 giây. Thông báo đẩy nền cần chạy trên HTTPS/localhost có khóa VAPID."}
          </p>
        )}

        {/* Reminder schedule preferences */}
        <div className="pt-2.5 mt-0.5 border-t border-border/80 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[12px] font-medium text-text-primary inline-flex items-center gap-1.5">
              <ClockIcon size={13} className="text-secondary" />
              Nhắc trước giờ học
            </span>
            <div className="inline-flex items-center gap-1 bg-background border border-border rounded-[10px] p-0.5">
              {REMINDER_MINUTES.map((m) => {
                const active = prefs.class_minutes === m;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={prefsSaving}
                    onClick={() => void handleUpdatePrefs({ class_minutes: m })}
                    className={cn(
                      "px-2 py-0.5 rounded-[8px] text-[11.5px] font-medium transition-colors cursor-pointer",
                      active
                        ? "bg-primary text-on-primary shadow-xs"
                        : "text-text-secondary hover:text-text-primary",
                    )}
                  >
                    {m} phút
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: "remind_deadline", label: "Deadline (24h & 1h)" },
                { key: "remind_duty", label: "Mentor Duty" },
                { key: "remind_meeting", label: "Họp nhóm" },
              ] as const
            ).map((opt) => {
              const on = prefs[opt.key];
              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={prefsSaving}
                  onClick={() => void handleUpdatePrefs({ [opt.key]: !on })}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-colors cursor-pointer",
                    on
                      ? "bg-sage-background text-on-sage border-primary/25"
                      : "bg-background text-text-secondary border-border hover:text-text-primary",
                  )}
                >
                  {on ? "✓ " : ""}{opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notification Items */}
      {notifications.length === 0 ? (
        <div className="p-6 rounded-[18px] bg-background border border-border flex flex-col items-center text-center gap-2">
          <span className="w-10 h-10 rounded-full bg-sage-background text-on-sage inline-flex items-center justify-center">
            <CalendarIcon size={18} />
          </span>
          <span className="text-[14px] font-semibold text-text-primary">
            Chưa có thay đổi lịch nào
          </span>
          <p className="text-[12.5px] text-text-secondary">
            Khi Admin cập nhật thời khóa biểu, đổi giờ/phòng học hoặc Mentor điều chỉnh ca trực, thông báo sẽ hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => {
            const isUnread = !seenSet.has(n.id);
            const meta = KIND_BADGE[n.kind] ?? KIND_BADGE.tkb_update;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  "w-full text-left p-3.5 rounded-[16px] border transition-colors cursor-pointer flex flex-col gap-1.5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary",
                  isUnread
                    ? "bg-[#FAF5FF]/70 border-secondary/35 hover:border-secondary/60"
                    : "bg-background border-border hover:bg-surface-subtle/60",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {isUnread ? (
                      <span
                        aria-label="Chưa đọc"
                        className="w-2 h-2 rounded-full bg-danger shrink-0"
                      />
                    ) : null}
                    <Badge variant={meta.variant} size="sm">
                      {meta.label}
                    </Badge>
                  </div>
                  {n.at ? (
                    <span className="text-[11px] text-text-secondary tabular-nums inline-flex items-center gap-1">
                      <ClockIcon size={11} />
                      {formatShortTime(n.at)}
                    </span>
                  ) : null}
                </div>
                <span className="text-[13.5px] leading-[19px] font-semibold text-text-primary">
                  {n.title}
                </span>
                <span className="text-[12.5px] leading-[18px] text-text-secondary text-pretty">
                  {n.body}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
