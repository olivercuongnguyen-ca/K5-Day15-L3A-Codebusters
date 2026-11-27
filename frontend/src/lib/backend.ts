/**
 * Client for the FastAPI backend (codebase/web/server.py), reached through the same-origin proxy in next.config.ts.
 * Converts backend schedule items into the ScheduleEvent shape the Unify screens already render.
 */
import type { DateStripItem, EventCategory } from "@/components/ui";
import type { ScheduleEvent, SourceName } from "@/data/mock-schedule";

// ---------- API ----------
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const res = await fetch(path, { credentials: "same-origin", ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.detail || body.question || `Lỗi ${res.status}`, res.status);
  return body as T;
}

export const post = <T>(path: string, data: unknown, method = "POST") =>
  api<T>(path, { method, body: JSON.stringify(data) });

// ---------- Backend shapes ----------
export interface BackendItem {
  source: "tkb" | "phoenix" | "mentor" | "team";
  id: string;
  kind: string;
  title: string;
  start: string; // 2026-11-27T16:00:00+07:00 (Vietnam time)
  end: string;
  is_deadline?: boolean;
  my_room?: string | null;
  class_rooms?: { code: string; building: string; backup: boolean }[];
  location?: string;
  url?: string;
  passcode?: string;
  note?: string;
  organizer?: string;
  cancelled?: boolean;
  changed_by_mentor?: boolean;
}

export interface WeekResponse {
  student_id: string;
  class: string;
  team: string | null;
  days: string[];
  items: BackendItem[];
  clashes: [string, string][];
  phoenix_linked: boolean;
  phoenix_synced_at: string | null;
  tkb_version: { hash: string; received_at: string; source: string } | null;
  room_changes: { session_id: string; old_room: string | null; new_room: string; name: string; date: string }[];
}

export interface StudentMe {
  student_id: string;
  class: string;
  team: string | null;
  team_set_by: string | null;
  short_name: string | null;
  has_password: boolean;
  signed_in: boolean;
  must_change: boolean;
}

export interface StaffMe {
  id: number;
  username: string;
  role: "admin" | "mentor";
  display_name: string;
  must_change: boolean;
  teams: string[];
}

export interface LeaveResult {
  status: "ready" | "need_info" | "refuse" | "error";
  sessions: string[];
  question: string;
  email: { to: string; subject: string; body: string } | null;
  links: { outlook_web: string; mailto: string } | null;
  based_on: string[];
}

export interface MeetingSuggestion {
  start: string;
  end: string;
  optional_overlaps: string[];
}

// ---------- Dates (Vietnam local) ----------
const WEEKDAY_LONG = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const pad = (n: number) => String(n).padStart(2, "0");

export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => isoDate(new Date());
const fromKey = (key: string) => new Date(`${key}T00:00:00`);
export const addDays = (key: string, n: number) => {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return isoDate(d);
};
export const mondayOf = (key: string) => {
  const d = fromKey(key);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoDate(d);
};
export const dm = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;
export const hm = (iso: string) => iso.slice(11, 16);

export function dateHeading(key: string, today = todayKey()): string {
  const d = fromKey(key);
  const base = `${WEEKDAY_LONG[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1}`;
  return key === today ? `${base}, hôm nay` : base;
}

export function weekStrip(selectedKey: string, events: ScheduleEvent[], today = todayKey()): DateStripItem[] {
  const monday = mondayOf(selectedKey);
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(monday, i);
    const d = fromKey(key);
    return {
      key,
      weekdayLabel: WEEKDAY_SHORT[d.getDay()],
      dayNumber: d.getDate(),
      fullDateLabel: dateHeading(key, today),
      isToday: key === today,
      hasEvents: events.some((e) => e.dateKey === key && !e.cancelled),
    };
  });
}

// ---------- Backend item -> ScheduleEvent ----------
const KIND_LABEL: Record<string, string> = {
  LEC: "Lý thuyết", LAB: "Thực hành", ONL: "Học online", KG: "Khai giảng", HACK: "Hackathon",
};

function categoryOf(i: BackendItem): EventCategory {
  if (i.is_deadline) return "deadline";
  if (i.source === "tkb") return "session";
  if (i.source === "team") return "meeting";
  if (i.kind === "mentor_duty") return "duty";
  return /office\s*hour/i.test(i.title) ? "officehour" : "coaching";
}

export function toScheduleEvent(i: BackendItem, w: WeekResponse): ScheduleEvent {
  const dateKey = i.start.slice(0, 10);
  const startTime = hm(i.start);
  const endTime = hm(i.end);
  const category = categoryOf(i);
  const room = i.my_room || undefined;
  const online = i.kind === "ONL" || (i.source === "phoenix" && !!i.location) || i.source === "team";
  const sources: SourceName[] = i.source === "tkb" ? ["Outlook"] : i.source === "team" ? ["Nhóm"] : ["Phoenix"];

  let formatLabel = "Hạn nộp";
  let formatDetail = "";
  if (i.source === "tkb") {
    formatLabel = i.kind === "ONL" ? "Học online" : room ? `Phòng ${room} · Tòa ${room[0]}` : "Chưa xếp phòng";
    formatDetail = i.kind === "ONL" ? "Buổi học online qua link của lớp"
      : room ? `Phòng của bạn: ${room}` : "Phòng chưa được xếp hoặc chưa xác nhận";
  } else if (i.source === "team") {
    formatLabel = "Họp online";
    formatDetail = i.passcode ? `Mật khẩu phòng họp: ${i.passcode}` : "Không cần mật khẩu phòng họp";
  } else if (!i.is_deadline) {
    formatLabel = online ? "Online" : "Theo lịch Phoenix";
    formatDetail = online ? "Tham gia qua link trên Phoenix" : "";
  }

  const notes: string[] = [];
  if (i.cancelled) notes.push("Đã huỷ");
  const change = w.room_changes.find((c) => c.session_id === i.id);
  if (change) notes.push(`Phòng đổi ${change.old_room ?? "—"} → ${change.new_room}`);
  if (i.changed_by_mentor && !i.cancelled) notes.push(`Mentor đã đổi lịch${i.note ? `: ${i.note}` : ""}`);
  if (w.clashes.some(([a, b]) => a === i.id || b === i.id) && !i.cancelled) notes.push("Trùng giờ");

  const updated = w.tkb_version?.received_at;
  const description =
    i.source === "tkb" ? `${KIND_LABEL[i.kind] ?? "Buổi học"} · lớp ${w.class}`
      : i.source === "team" ? (i.note || `Họp nhóm do ${i.organizer} đặt lịch`)
        : i.is_deadline ? "Hạn nộp trên Phoenix" : i.kind === "mentor_duty" ? `Mentor duty ${w.team ?? ""}`.trim()
          : "Sự kiện trên Phoenix";

  return {
    id: i.id,
    dateKey,
    dateLabel: dateHeading(dateKey),
    title: i.title,
    category,
    startTime,
    endTime,
    timeRange: i.is_deadline ? `Hạn ${startTime}` : `${startTime} – ${endTime}`,
    formatLabel,
    formatDetail,
    description,
    sources,
    updatedAt: updated ? `Cập nhật ${dm(updated.slice(0, 10))}` : "",
    ctaLabel: i.url ? (i.source === "team" ? "Vào phòng họp" : "Mở link buổi") : i.source === "tkb" ? "Xin nghỉ buổi này" : "Đóng",
    roomCode: room,
    allRooms: (i.class_rooms ?? []).map((r) => r.code + (r.backup ? "*" : "")),
    groupId: (w.class as ScheduleEvent["groupId"]) ?? undefined,
    changeNote: notes.length ? notes.join(" · ") : undefined,
    joinUrl: i.url || (i.location?.startsWith("http") ? i.location : undefined),
    passcode: i.passcode || undefined,
    organizer: i.organizer,
    cancelled: i.cancelled,
    leaveHint: i.source === "tkb" ? `${i.title} ${dm(dateKey)}` : undefined,
  };
}
