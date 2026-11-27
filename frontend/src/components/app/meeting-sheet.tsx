"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, dm, hm, post, type MeetingSuggestion, type StudentMe } from "@/lib/backend";
import { cn } from "@/lib/cn";
import { Badge, Button, InfoIcon, Input, LockIcon, Sheet, VideoIcon } from "@/components/ui";
import { useApp } from "./app-provider";

const DURATIONS = [
  { value: 30, label: "30 phút" },
  { value: 60, label: "1 giờ" },
  { value: 90, label: "1 giờ 30" },
  { value: 120, label: "2 giờ" },
];
const DOW = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const whenOf = (start: string, end: string) =>
  `${DOW[new Date(`${start.slice(0, 10)}T00:00:00`).getDay()]} ${dm(start.slice(0, 10))} · ${hm(start)}–${hm(end)}`;

/**
 * Team meeting scheduler. Suggestions are times when no teammate has a required item (class, mentor duty, another
 * meeting). Scheduling needs the student's password (set the first time); teammates see the meeting by ID only.
 */
export function MeetingSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { student, setStudent, schedule, showToast } = useApp();
  const [duration, setDuration] = useState(60);
  // the shown result belongs to one request (team + duration); anything else means "still loading"
  const [result, setResult] = useState<{ key: string; suggestions: MeetingSuggestion[]; error: string | null; team: string }>(
    { key: "", suggestions: [], error: null, team: "" });
  const requestKey = `${student?.team ?? ""}|${duration}`;
  const loaded = result.key === requestKey;
  const suggestions = loaded && !result.error ? result.suggestions : null;
  const sugError = loaded ? result.error : null;
  const teamInfo = result.team;
  const [picked, setPicked] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [passcode, setPasscode] = useState("");
  const [note, setNote] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "warning"; text: string } | null>(null);
  const [needsForce, setNeedsForce] = useState(false);

  const pick = useCallback((g: MeetingSuggestion, index: number) => {
    setPicked(index);
    setDate(g.start.slice(0, 10));
    setStart(hm(g.start));
    setEnd(hm(g.end));
    setNeedsForce(false);
    setMessage(null);
  }, []);

  useEffect(() => {
    if (!open || !student?.team) return;
    const key = `${student.team}|${duration}`;
    api<{ team: string; members: number; suggestions: MeetingSuggestion[] }>(`/api/meetings/suggest?duration=${duration}`)
      .then((r) => {
        setResult({ key, suggestions: r.suggestions, error: null, team: `${r.team} · ${r.members} thành viên` });
        const k = Math.max(0, r.suggestions.findIndex((g) => !g.optional_overlaps.length));
        if (r.suggestions.length) pick(r.suggestions[k], k);
      })
      .catch((err: Error) => setResult({ key, suggestions: [], error: err.message, team: "" }));
  }, [open, duration, student?.team, pick]);

  const needAuth = Boolean(student && (!student.signed_in || student.must_change));

  async function submit(force: boolean) {
    if (!student) return;
    setMessage(null);
    if (!date || !start || !end) return setMessage({ tone: "error", text: "Chọn ngày và giờ họp." });
    if (!/^https?:\/\/\S{3,}$/.test(link.trim()))
      return setMessage({ tone: "error", text: "Dán link họp bắt đầu bằng https:// (Google Meet, Zoom, Teams…)." });
    setBusy(true);
    try {
      if (needAuth) {
        if (!student.has_password && pw !== pw2) throw new Error("Hai mật khẩu không khớp.");
        const me = await post<StudentMe>("/api/student/login", {
          student_id: student.student_id, password: pw, create: !student.has_password,
        });
        setStudent({ ...student, ...me });
        setPw(""); setPw2("");
        if (me.must_change) throw new Error("Đây là mật khẩu tạm do giáo vụ cấp. Đổi mật khẩu trước khi đặt lịch.");
      }
      const r = await post<{ team: string; start: string; end: string }>("/api/meetings", {
        start: `${date}T${start}`, end: `${date}T${end}`, link: link.trim(), passcode: passcode.trim(),
        title: title.trim(), note: note.trim(), force,
      });
      schedule.reload();
      showToast(`Đã đặt lịch họp ${r.team} lúc ${whenOf(r.start, r.end)} và báo cho cả nhóm.`, "success");
      setTitle(""); setLink(""); setPasscode(""); setNote(""); setNeedsForce(false);
      onClose();
    } catch (err) {
      const text = (err as Error).message;
      setNeedsForce(text.startsWith("Trùng lịch"));
      setMessage({ tone: text.startsWith("Trùng lịch") ? "warning" : "error", text });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      placement="drawer"
      size="md"
      onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}
      title="Đặt lịch họp nhóm"
      subtitle="Cả nhóm sẽ thấy lịch và nhận thông báo, không cần mật khẩu"
      headerBadge={teamInfo ? <Badge variant="primary">{teamInfo}</Badge> : undefined}
      footer={
        student?.team ? (
          <div className="flex flex-col gap-2 w-full">
            {needsForce ? (
              <Button variant="outline" size="lg" fullWidth disabled={busy} onClick={() => void submit(true)}>
                Vẫn đặt giờ này
              </Button>
            ) : null}
            <Button variant="primary" size="lg" fullWidth loading={busy} leftIcon={<VideoIcon size={17} />}
              onClick={() => void submit(false)}>
              Đặt lịch và báo cho nhóm
            </Button>
          </div>
        ) : undefined
      }
    >
      {!student?.team ? (
        <div className="flex items-start gap-2.5 p-3.5 rounded-[16px] bg-warning-background text-on-warning">
          <InfoIcon size={18} className="shrink-0 mt-0.5" />
          <p className="text-[13px] leading-[19px]">
            Bạn chưa có nhóm. Nhập số nhóm trong{" "}
            <Link href="/settings" className="underline" onClick={onClose}>Cài đặt</Link> để đặt lịch họp nhóm.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-2.5" aria-labelledby="meet-sug-heading">
            <div className="flex items-center justify-between gap-2">
              <h3 id="meet-sug-heading" className="text-[14.5px] leading-[20px] font-semibold text-text-primary">
                Giờ cả nhóm đều rảnh
              </h3>
              <select
                aria-label="Thời lượng"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="min-h-9 rounded-full border border-border bg-surface px-3 text-[13px] text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <p className="text-[12.5px] leading-[18px] text-text-secondary">
              Không trùng buổi học hay mentor duty của bất kỳ ai trong nhóm. Workshop, office hour không tính là bận.
            </p>
            {sugError ? <p className="text-[13px] text-danger">{sugError}</p> : null}
            {!suggestions && !sugError ? <p className="text-[13px] text-text-secondary">Đang tìm giờ rảnh…</p> : null}
            {suggestions && suggestions.length === 0 ? (
              <p className="text-[13px] text-text-secondary">
                7 ngày tới không có giờ nào cả nhóm cùng rảnh (08:00–22:00). Bạn vẫn có thể tự chọn giờ ở dưới.
              </p>
            ) : null}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(suggestions ?? []).map((g, k) => (
                <button
                  key={g.start}
                  type="button"
                  aria-pressed={picked === k}
                  onClick={() => pick(g, k)}
                  className={cn(
                    "text-left min-h-11 px-3.5 py-2.5 rounded-[16px] border transition-colors duration-[180ms] cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    picked === k ? "border-primary bg-primary-container text-on-primary-container"
                      : "border-border bg-surface hover:bg-surface-subtle text-text-primary",
                  )}
                >
                  <span className="block text-[13.5px] font-semibold tabular-nums">{whenOf(g.start, g.end)}</span>
                  <span className="block text-[12px] text-text-secondary">
                    {g.optional_overlaps.length ? `Trùng: ${g.optional_overlaps.join(", ")} (không bắt buộc)` : "Cả nhóm đều rảnh"}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3" aria-label="Thông tin buổi họp">
            <Input label="Tiêu đề (không bắt buộc)" value={title} maxLength={80} placeholder="Họp nhóm"
              onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="col-span-2 sm:col-span-1">
                <Input label="Ngày" type="date" value={date} onChange={(e) => { setDate(e.target.value); setPicked(null); }} />
              </div>
              <Input label="Bắt đầu" type="time" step={900} tabularNums value={start}
                onChange={(e) => { setStart(e.target.value); setPicked(null); }} />
              <Input label="Kết thúc" type="time" step={900} tabularNums value={end}
                onChange={(e) => { setEnd(e.target.value); setPicked(null); }} />
            </div>
            <Input label="Link họp" type="url" inputMode="url" value={link} leftIcon={<VideoIcon size={16} />}
              placeholder="https://meet.google.com/… hoặc https://zoom.us/j/…" onChange={(e) => setLink(e.target.value)} />
            <Input label="Mật khẩu phòng họp (không bắt buộc)" value={passcode} maxLength={64} placeholder="vd 123456"
              autoComplete="off" onChange={(e) => setPasscode(e.target.value)} />
            <Input label="Ghi chú (không bắt buộc)" value={note} maxLength={300} placeholder="vd chốt slide demo"
              onChange={(e) => setNote(e.target.value)} />
          </section>

          {needAuth ? (
            <section className="flex flex-col gap-2.5 p-3.5 rounded-[16px] bg-surface-subtle border border-border" aria-label="Đăng nhập để đặt lịch">
              <p className="flex items-start gap-2 text-[12.5px] leading-[18px] text-text-secondary">
                <LockIcon size={15} className="shrink-0 mt-0.5 text-primary" />
                {student?.has_password
                  ? "Để đặt lịch họp, đăng nhập bằng mật khẩu của bạn. Xem lịch vẫn chỉ cần mã học viên."
                  : "Lần đầu đặt lịch họp: tạo mật khẩu cho mã học viên của bạn. Các bạn trong nhóm không cần mật khẩu để xem hay vào họp."}
              </p>
              <Input label={student?.has_password ? "Mật khẩu của bạn" : "Tạo mật khẩu (≥ 8 ký tự)"} type="password"
                value={pw} autoComplete={student?.has_password ? "current-password" : "new-password"}
                onChange={(e) => setPw(e.target.value)} />
              {!student?.has_password ? (
                <Input label="Nhập lại mật khẩu" type="password" value={pw2} autoComplete="new-password"
                  onChange={(e) => setPw2(e.target.value)} />
              ) : null}
            </section>
          ) : null}

          {message ? (
            <p role="status" className={cn("text-[13px] leading-[19px] rounded-[14px] px-3.5 py-2.5",
              message.tone === "warning" ? "bg-warning-background text-on-warning" : "bg-danger-background text-on-danger-background")}>
              {message.text}
            </p>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}
