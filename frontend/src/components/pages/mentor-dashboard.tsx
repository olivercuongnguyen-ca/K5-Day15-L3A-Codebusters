"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, post } from "@/lib/backend";
import { cn } from "@/lib/cn";
import {
  Badge,
  Button,
  CalendarIcon,
  ClockIcon,
  Input,
  LockIcon,
  RefreshIcon,
  Sheet,
  Skeleton,
} from "@/components/ui";
import { useApp } from "@/components/app/app-provider";

export interface DutyItem {
  id: string;
  source: "phoenix" | "mentor";
  team: string;
  title: string;
  start: string; // YYYY-MM-DDTHH:MM:SS+07:00
  end: string;
  cancelled: boolean;
  note: string;
  students: number;
  original: { start: string; end: string } | null;
}

interface DutiesResponse {
  teams: string[] | "all";
  duties: DutyItem[];
}

function formatDutyDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function formatDutyTime(start: string, end: string): string {
  return `${start.slice(11, 16)} – ${end.slice(11, 16)}`;
}

function defaultTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function StaffPasswordBanner() {
  const { staff, refreshIdentity, showToast } = useApp();
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);

  if (!staff?.must_change) return null;

  async function handleChange(e: React.FormEvent) {
    e.preventDefault();
    if (!oldPw || newPw.length < 8) {
      showToast("Mật khẩu mới cần ít nhất 8 ký tự.", "warning");
      return;
    }
    setBusy(true);
    try {
      await post("/api/auth/password", { old: oldPw, new: newPw });
      setOldPw("");
      setNewPw("");
      await refreshIdentity();
      showToast("Đã đổi mật khẩu thành công. Các tính năng quản trị đã mở khóa.", "success");
    } catch (err) {
      showToast((err as Error).message, "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Yêu cầu đổi mật khẩu tạm"
      className="bg-warning-background/85 border border-amber-300 rounded-[20px] md:rounded-[24px] p-4 md:p-5 flex flex-col gap-3"
    >
      <div className="flex items-start gap-2.5 text-on-warning">
        <LockIcon size={18} className="shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[14.5px] md:text-[15.5px] font-semibold">
            Cần đổi mật khẩu tạm trước khi thao tác
          </h2>
          <p className="text-[12.5px] md:text-[13px] leading-[19px]">
            Tài khoản này đang dùng mật khẩu tạm. Hãy đặt mật khẩu mới (tối thiểu 8 ký tự) để mở khóa đầy đủ chức năng.
          </p>
        </div>
      </div>

      <form onSubmit={handleChange} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
        <Input
          label="Mật khẩu tạm hiện tại"
          type="password"
          value={oldPw}
          onChange={(e) => setOldPw(e.target.value)}
          placeholder="Nhập mật khẩu tạm"
        />
        <Input
          label="Mật khẩu mới (≥ 8 ký tự)"
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          placeholder="Nhập mật khẩu mới"
        />
        <Button type="submit" variant="primary" size="md" loading={busy} fullWidth>
          Cập nhật mật khẩu
        </Button>
      </form>
    </section>
  );
}

export function MentorDashboard({ embedded = false }: { embedded?: boolean }) {
  const { staff, currentUser, showToast } = useApp();
  const [duties, setDuties] = useState<DutyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  // Add duty modal state
  const [addOpen, setAddOpen] = useState(false);
  const [newTeam, setNewTeam] = useState("");
  const [newDate, setNewDate] = useState(defaultTodayStr);
  const [newStart, setNewStart] = useState("19:30");
  const [newEnd, setNewEnd] = useState("21:00");
  const [newNote, setNewNote] = useState("");
  const [savingAdd, setSavingAdd] = useState(false);

  // Edit duty drawer state
  const [editingDuty, setEditingDuty] = useState<DutyItem | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editNote, setEditNote] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const loadDuties = useCallback(async () => {
    if (staff?.must_change) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api<DutiesResponse>("/api/mentor/duties");
      setDuties(res.duties ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [staff?.must_change]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      void loadDuties();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [loadDuties]);

  const teamOptions = useMemo(() => {
    const set = new Set<string>(staff?.teams ?? []);
    for (const d of duties) set.add(d.team);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  }, [staff?.teams, duties]);

  const filteredDuties = useMemo(
    () =>
      selectedTeam === "all"
        ? duties
        : duties.filter((d) => d.team === selectedTeam),
    [duties, selectedTeam],
  );

  function openAddModal() {
    setNewTeam(staff?.teams[0] ?? teamOptions[0] ?? "Nhóm 1");
    setNewDate(defaultTodayStr());
    setNewStart("19:30");
    setNewEnd("21:00");
    setNewNote("");
    setAddOpen(true);
  }

  function openEditDrawer(duty: DutyItem) {
    setEditingDuty(duty);
    setEditDate(duty.start.slice(0, 10));
    setEditStart(duty.start.slice(11, 16));
    setEditEnd(duty.end.slice(11, 16));
    setEditNote(duty.note || "");
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeam.trim() || !newDate || !newStart || !newEnd) {
      showToast("Vui lòng điền đầy đủ nhóm, ngày và khung giờ.", "warning");
      return;
    }
    setSavingAdd(true);
    try {
      await post("/api/mentor/duties", {
        team: newTeam.trim(),
        start: `${newDate}T${newStart}`,
        end: `${newDate}T${newEnd}`,
        note: newNote.trim(),
      });
      setAddOpen(false);
      showToast("Đã thêm ca mentor duty mới và gửi thông báo tới nhóm.", "success");
      await loadDuties();
    } catch (err) {
      showToast((err as Error).message, "danger");
    } finally {
      setSavingAdd(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDuty) return;
    setSavingEdit(true);
    try {
      await post(
        `/api/mentor/duties/${encodeURIComponent(editingDuty.id)}`,
        {
          start: `${editDate}T${editStart}`,
          end: `${editDate}T${editEnd}`,
          note: editNote.trim(),
        },
        "PATCH",
      );
      setEditingDuty(null);
      showToast("Đã cập nhật ca mentor duty.", "success");
      await loadDuties();
    } catch (err) {
      showToast((err as Error).message, "danger");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleCancel(duty: DutyItem) {
    try {
      await post(
        `/api/mentor/duties/${encodeURIComponent(duty.id)}`,
        { cancelled: !duty.cancelled },
        "PATCH",
      );
      showToast(
        duty.cancelled ? "Đã khôi phục ca trực." : "Đã đánh dấu hủy ca trực.",
        "info",
      );
      await loadDuties();
    } catch (err) {
      showToast((err as Error).message, "danger");
    }
  }

  async function handleDeleteOrReset(duty: DutyItem) {
    try {
      await api(`/api/mentor/duties/${encodeURIComponent(duty.id)}`, {
        method: "DELETE",
      });
      showToast(
        duty.source === "mentor"
          ? "Đã xóa ca trực vừa thêm."
          : "Đã hoàn tác về giờ gốc trên Phoenix.",
        "success",
      );
      await loadDuties();
    } catch (err) {
      showToast((err as Error).message, "danger");
    }
  }

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {!embedded ? (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="primary" size="sm">
                  Mentor / Lab Coach
                </Badge>
                {staff?.teams.map((t) => (
                  <Badge key={t} variant="secondary" size="sm">
                    {t}
                  </Badge>
                ))}
              </div>
              <h1 className="text-[22px] leading-[28px] md:text-[26px] md:leading-[34px] font-semibold tracking-[-0.2px] text-text-primary">
                Lịch trực · {currentUser.name}
              </h1>
              <p className="text-[12.5px] md:text-[13.5px] text-text-secondary">
                Xem, thêm ca mới hoặc điều chỉnh giờ mentor duty cho các nhóm phụ trách.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshIcon size={15} />}
                onClick={() => void loadDuties()}
              >
                Làm mới
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CalendarIcon size={15} />}
                disabled={Boolean(staff?.must_change)}
                onClick={openAddModal}
              >
                Thêm ca trực
              </Button>
            </div>
          </header>

          <StaffPasswordBanner />
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-col">
            <h2 className="text-[16px] md:text-[18px] font-semibold text-text-primary">
              Lịch trực Mentor toàn khóa
            </h2>
            <p className="text-[12.5px] text-text-secondary">
              Admin có thể xem, thêm hoặc điều chỉnh ca trực cho tất cả các nhóm.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshIcon size={15} />}
              onClick={() => void loadDuties()}
            >
              Làm mới
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CalendarIcon size={15} />}
              disabled={Boolean(staff?.must_change)}
              onClick={openAddModal}
            >
              Thêm ca trực
            </Button>
          </div>
        </div>
      )}

      {/* Team filter bar */}
      {teamOptions.length > 0 ? (
        <div
          role="group"
          aria-label="Lọc theo nhóm"
          className="flex flex-wrap items-center gap-1.5"
        >
          <button
            type="button"
            aria-pressed={selectedTeam === "all"}
            onClick={() => setSelectedTeam("all")}
            className={cn(
              "min-h-8 px-3 rounded-full text-[12px] font-medium transition-colors cursor-pointer",
              selectedTeam === "all"
                ? "bg-primary text-on-primary"
                : "bg-surface border border-border text-text-primary hover:bg-surface-subtle",
            )}
          >
            Tất cả ({duties.length})
          </button>
          {teamOptions.map((t) => {
            const count = duties.filter((d) => d.team === t).length;
            const active = selectedTeam === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedTeam(t)}
                className={cn(
                  "min-h-8 px-3 rounded-full text-[12px] font-medium transition-colors cursor-pointer",
                  active
                    ? "bg-primary text-on-primary"
                    : "bg-surface border border-border text-text-primary hover:bg-surface-subtle",
                )}
              >
                {t} ({count})
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Error */}
      {error ? (
        <div
          role="alert"
          className="p-4 rounded-[18px] bg-danger-background text-on-danger-background text-[13px]"
        >
          {error}
        </div>
      ) : null}

      {/* Duties List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" rounded="xl" />
          <Skeleton className="h-28 w-full" rounded="xl" />
        </div>
      ) : filteredDuties.length === 0 ? (
        <div className="bg-surface border border-border rounded-[20px] md:rounded-[24px] p-6 md:p-8 shadow-card-sm flex flex-col items-center text-center gap-2.5">
          <span className="w-11 h-11 rounded-full bg-sage-background text-on-sage inline-flex items-center justify-center">
            <ClockIcon size={20} />
          </span>
          <h3 className="text-[15.5px] font-semibold text-text-primary">
            Chưa có ca mentor duty nào trong 4 tuần tới
          </h3>
          <p className="text-[13px] text-text-secondary max-w-md">
            Các ca trực từ Phoenix sẽ tự hiện tại đây khi học viên trong nhóm kết nối Phoenix, hoặc bạn có thể chủ động bấm <strong>Thêm ca trực</strong>.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredDuties.map((duty) => (
            <article
              key={duty.id}
              className={cn(
                "bg-surface border rounded-[20px] p-4 shadow-card-sm flex flex-col gap-3",
                duty.cancelled ? "border-danger/35 opacity-80" : "border-border",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">{duty.team}</Badge>
                    <Badge variant={duty.source === "mentor" ? "info" : "outline"}>
                      {duty.source === "mentor" ? "Mentor thêm" : "Phoenix"}
                    </Badge>
                    {duty.cancelled ? (
                      <Badge variant="danger">Đã hủy</Badge>
                    ) : duty.original ? (
                      <Badge variant="warning">Đã đổi giờ</Badge>
                    ) : (
                      <Badge variant="success" dot>
                        Hoạt động
                      </Badge>
                    )}
                    <Badge variant="neutral">{duty.students} học viên</Badge>
                  </div>
                  <h3
                    className={cn(
                      "text-[15px] font-semibold text-text-primary",
                      duty.cancelled && "line-through text-text-secondary",
                    )}
                  >
                    {duty.title}
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[13px] text-text-secondary tabular-nums">
                <span className="inline-flex items-center gap-1.5 font-medium text-text-primary">
                  <ClockIcon size={15} className="text-secondary shrink-0" />
                  {formatDutyDate(duty.start)} · {formatDutyTime(duty.start, duty.end)}
                </span>
                {duty.original ? (
                  <span className="line-through text-[12px]">
                    Gốc: {formatDutyDate(duty.original.start)} ·{" "}
                    {formatDutyTime(duty.original.start, duty.original.end)}
                  </span>
                ) : null}
              </div>

              {duty.note ? (
                <p className="text-[12.5px] leading-[19px] text-text-secondary bg-surface-subtle px-3 py-2 rounded-[12px]">
                  Ghi chú: {duty.note}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/75">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDrawer(duty)}
                >
                  Đổi giờ / Ghi chú
                </Button>
                <Button
                  variant={duty.cancelled ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => void handleToggleCancel(duty)}
                >
                  {duty.cancelled ? "Khôi phục ca" : "Hủy ca"}
                </Button>
                {duty.source === "mentor" || duty.original || duty.cancelled ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger-background"
                    onClick={() => void handleDeleteOrReset(duty)}
                  >
                    {duty.source === "mentor" ? "Xóa ca" : "Hoàn tác về Phoenix"}
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Add Duty Modal */}
      <Sheet
        open={addOpen}
        placement="modal"
        size="sm"
        onOpenChange={setAddOpen}
        title="Thêm ca mentor duty mới"
        subtitle="Học viên thuộc nhóm được chọn sẽ thấy ca trực mới ngay trên lịch."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="md" onClick={() => setAddOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={savingAdd}
              onClick={handleAddSubmit}
            >
              Tạo ca trực
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddSubmit} className="flex flex-col gap-3.5">
          {staff?.role === "mentor" && staff.teams.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="duty-team-select"
                className="text-[12.5px] font-medium text-text-primary"
              >
                Nhóm phụ trách
              </label>
              <select
                id="duty-team-select"
                value={newTeam}
                onChange={(e) => setNewTeam(e.target.value)}
                className="w-full min-h-10 rounded-[14px] border border-border bg-background px-3 text-[14px] text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {staff.teams.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <Input
              label="Nhóm (ví dụ: Nhóm 10)"
              value={newTeam}
              onChange={(e) => setNewTeam(e.target.value)}
              placeholder="Nhóm 10"
            />
          )}

          <Input
            label="Ngày trực"
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Giờ bắt đầu"
              type="time"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
            />
            <Input
              label="Giờ kết thúc"
              type="time"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
            />
          </div>

          <Input
            label="Ghi chú / phòng hoặc link họp (tùy chọn)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Ví dụ: Trực tại phòng H209 hoặc qua Zoom"
          />
        </form>
      </Sheet>

      {/* Edit Duty Drawer */}
      <Sheet
        open={Boolean(editingDuty)}
        placement="drawer"
        size="sm"
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingDuty(null);
        }}
        title="Đổi giờ / Ghi chú ca trực"
        subtitle={editingDuty ? `${editingDuty.team} · ${editingDuty.title}` : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="md" onClick={() => setEditingDuty(null)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={savingEdit}
              onClick={handleEditSubmit}
            >
              Lưu thay đổi
            </Button>
          </div>
        }
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-3.5">
          <Input
            label="Ngày trực"
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Giờ bắt đầu"
              type="time"
              value={editStart}
              onChange={(e) => setEditStart(e.target.value)}
            />
            <Input
              label="Giờ kết thúc"
              type="time"
              value={editEnd}
              onChange={(e) => setEditEnd(e.target.value)}
            />
          </div>
          <Input
            label="Ghi chú gửi học viên"
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="Ví dụ: Đổi sang 20:00 do bận họp"
          />
        </form>
      </Sheet>
    </div>
  );
}
