"use client";

import { useCallback, useEffect, useState } from "react";
import { api, post } from "@/lib/backend";
import { cn } from "@/lib/cn";
import {
  Badge,
  Button,
  CalendarIcon,
  ClockIcon,
  CopyIcon,
  Dialog,
  Input,
  RefreshIcon,
  Sheet,
  ShieldIcon,
  Skeleton,
  Tabs,
  UserIcon,
} from "@/components/ui";
import { useApp } from "@/components/app/app-provider";
import { MentorDashboard, StaffPasswordBanner } from "./mentor-dashboard";

interface ClassSummary {
  class: string;
  students: number;
}

interface AdminSession {
  id: string;
  class: string;
  date: string;
  slot: string;
  kind: string;
  name: string;
  start: string;
  end: string;
  rooms: Array<{ code: string; building?: string; backup?: boolean; students: number }>;
}

interface StaffUserRow {
  id: number;
  username: string;
  role: "admin" | "mentor";
  display_name: string;
  teams: string[];
  disabled: boolean;
  must_change: boolean;
}

export function AdminDashboard() {
  const { staff, currentUser, showToast } = useApp();
  const [activeTab, setActiveTab] = useState("timetable");

  // Timetable & Sessions state
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [uploadingTkb, setUploadingTkb] = useState(false);

  // Edit Session Drawer
  const [editingSession, setEditingSession] = useState<AdminSession | null>(null);
  const [sessDate, setSessDate] = useState("");
  const [sessStart, setSessStart] = useState("");
  const [sessEnd, setSessEnd] = useState("");
  const [roomFrom, setRoomFrom] = useState("");
  const [roomTo, setRoomTo] = useState("");
  const [sessNote, setSessNote] = useState("");
  const [savingSession, setSavingSession] = useState(false);

  // Users state
  const [users, setUsers] = useState<StaffUserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Create User Modal
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newRole, setNewRole] = useState<"mentor" | "admin">("mentor");
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newTeamsText, setNewTeamsText] = useState("");
  const [savingUser, setSavingUser] = useState(false);

  // Edit Teams Modal
  const [editingTeamsUser, setEditingTeamsUser] = useState<StaffUserRow | null>(null);
  const [editTeamsText, setEditTeamsText] = useState("");
  const [savingTeams, setSavingTeams] = useState(false);

  // Reset Password Result Dialog
  const [resetResult, setResetResult] = useState<{
    username: string;
    password: string;
    note: string;
  } | null>(null);

  const loadClasses = useCallback(async () => {
    if (staff?.must_change) return;
    try {
      const list = await api<ClassSummary[]>("/api/admin/classes");
      setClasses(list);
      setSelectedClass((prev) => prev || list[0]?.class || "");
    } catch (err) {
      showToast((err as Error).message, "danger");
    }
  }, [staff?.must_change, showToast]);

  const loadSessions = useCallback(
    async (cls: string) => {
      if (!cls || staff?.must_change) return;
      setLoadingSessions(true);
      try {
        const list = await api<AdminSession[]>(
          `/api/admin/sessions?cls=${encodeURIComponent(cls)}`,
        );
        setSessions(list);
      } catch (err) {
        showToast((err as Error).message, "danger");
      } finally {
        setLoadingSessions(false);
      }
    },
    [staff?.must_change, showToast],
  );

  const loadUsers = useCallback(async () => {
    if (staff?.must_change) return;
    setLoadingUsers(true);
    try {
      const list = await api<StaffUserRow[]>("/api/admin/users");
      setUsers(list);
    } catch (err) {
      showToast((err as Error).message, "danger");
    } finally {
      setLoadingUsers(false);
    }
  }, [staff?.must_change, showToast]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      void loadClasses();
      void loadUsers();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [loadClasses, loadUsers]);

  useEffect(() => {
    if (!selectedClass) return;
    const raf = window.requestAnimationFrame(() => {
      void loadSessions(selectedClass);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [selectedClass, loadSessions]);

  async function handleUploadTkb(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploadingTkb(true);
    try {
      const res = await api<{ students?: number; sessions?: number }>(
        "/api/admin/ingest",
        { method: "POST", body: fd },
      );
      showToast(
        `Đã cập nhật thời khóa biểu${res.students ? ` (${res.students} học viên)` : ""}.`,
        "success",
      );
      await loadClasses();
      if (selectedClass) await loadSessions(selectedClass);
    } catch (err) {
      showToast((err as Error).message, "danger");
    } finally {
      setUploadingTkb(false);
    }
  }

  function openSessionEditor(sess: AdminSession) {
    setEditingSession(sess);
    setSessDate(sess.date);
    setSessStart(sess.start);
    setSessEnd(sess.end);
    setRoomFrom("");
    setRoomTo("");
    setSessNote("");
  }

  async function handleSaveSession(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSession) return;
    setSavingSession(true);
    try {
      const payload: Record<string, string | null> = {
        date: sessDate,
        start: sessStart,
        end: sessEnd,
        note: sessNote.trim(),
      };
      if (roomFrom || roomTo) {
        payload.room_from = roomFrom;
        payload.room_to = roomTo;
      }
      await post(
        `/api/admin/sessions/${encodeURIComponent(editingSession.id)}`,
        payload,
        "PATCH",
      );
      setEditingSession(null);
      showToast("Đã cập nhật buổi học và gửi thông báo tới học viên.", "success");
      await loadSessions(selectedClass);
    } catch (err) {
      showToast((err as Error).message, "danger");
    } finally {
      setSavingSession(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim() || newPassword.length < 8) {
      showToast("Nhập tên đăng nhập và mật khẩu tối thiểu 8 ký tự.", "warning");
      return;
    }
    setSavingUser(true);
    try {
      const teams =
        newRole === "mentor"
          ? newTeamsText
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [];
      await post("/api/admin/users", {
        username: newUsername.trim(),
        role: newRole,
        display_name: newDisplayName.trim(),
        password: newPassword,
        teams,
      });
      setCreateUserOpen(false);
      setNewUsername("");
      setNewDisplayName("");
      setNewPassword("");
      setNewTeamsText("");
      showToast("Đã tạo tài khoản mới thành công.", "success");
      await loadUsers();
    } catch (err) {
      showToast((err as Error).message, "danger");
    } finally {
      setSavingUser(false);
    }
  }

  async function handleSaveTeams(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTeamsUser) return;
    setSavingTeams(true);
    try {
      const teams = editTeamsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await post(
        `/api/admin/users/${editingTeamsUser.id}/teams`,
        { teams },
        "PUT",
      );
      setEditingTeamsUser(null);
      showToast("Đã cập nhật nhóm phụ trách cho Mentor.", "success");
      await loadUsers();
    } catch (err) {
      showToast((err as Error).message, "danger");
    } finally {
      setSavingTeams(false);
    }
  }

  async function handleResetPassword(u: StaffUserRow) {
    try {
      const res = await post<{ temporary_password: string; note: string }>(
        `/api/admin/users/${u.id}/reset`,
        {},
      );
      setResetResult({
        username: u.username,
        password: res.temporary_password,
        note: res.note,
      });
      await loadUsers();
    } catch (err) {
      showToast((err as Error).message, "danger");
    }
  }

  async function handleToggleDisable(u: StaffUserRow) {
    try {
      await post(`/api/admin/users/${u.id}/disable`, { disabled: !u.disabled });
      showToast(
        u.disabled ? `Đã mở khóa tài khoản ${u.username}.` : `Đã khóa tài khoản ${u.username}.`,
        "info",
      );
      await loadUsers();
    } catch (err) {
      showToast((err as Error).message, "danger");
    }
  }

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="primary" size="sm" icon={<ShieldIcon size={12} />}>
              Admin · Ban đào tạo
            </Badge>
            <Badge variant="neutral" size="sm">
              {classes.reduce((acc, c) => acc + c.students, 0)} học viên
            </Badge>
          </div>
          <h1 className="text-[22px] leading-[28px] md:text-[26px] md:leading-[34px] font-semibold tracking-[-0.2px] text-text-primary">
            Quản trị Unify · {currentUser.name}
          </h1>
          <p className="text-[12.5px] md:text-[13.5px] text-text-secondary">
            Cập nhật thời khóa biểu, điều chỉnh giờ/phòng học, quản lý tài khoản Mentor và lịch trực toàn khóa.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshIcon size={15} />}
          onClick={() => {
            void loadClasses();
            void loadUsers();
            if (selectedClass) void loadSessions(selectedClass);
          }}
        >
          Làm mới
        </Button>
      </header>

      <StaffPasswordBanner />

      {/* Main Admin Tabs */}
      <Tabs
        ariaLabel="Khu vực quản trị"
        value={activeTab}
        onValueChange={setActiveTab}
        items={[
          { value: "timetable", label: "Lịch học & Phòng" },
          { value: "users", label: "Tài khoản & Nhóm" },
          { value: "duties", label: "Lịch trực Mentor" },
        ]}
      />

      {/* TAB 1: TIMETABLE & SESSIONS */}
      {activeTab === "timetable" ? (
        <div className="flex flex-col gap-4">
          {/* Upload Timetable Card */}
          <section className="bg-surface border border-border rounded-[20px] md:rounded-[24px] p-4 md:p-5 shadow-card-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[15px] md:text-[16px] font-semibold text-text-primary">
                Cập nhật thời khóa biểu chính thức
              </h2>
              <p className="text-[12.5px] text-text-secondary">
                Tải file <code>.html</code> hoặc <code>.eml</code> từ email ban đào tạo. App sẽ tự tính chênh lệch phòng học và gửi thông báo cho học viên.
              </p>
            </div>
            <label
              className={cn(
                "inline-flex items-center justify-center rounded-full min-h-9 px-4 text-[13px] font-medium bg-primary text-on-primary hover:bg-primary-pressed transition-colors cursor-pointer shrink-0",
                (uploadingTkb || staff?.must_change) && "opacity-60 pointer-events-none",
              )}
            >
              <span>{uploadingTkb ? "Đang tải lên…" : "Chọn file TKB (.html/.eml)"}</span>
              <input
                type="file"
                accept=".html,.htm,.eml"
                className="sr-only"
                disabled={uploadingTkb || Boolean(staff?.must_change)}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  void handleUploadTkb(f);
                }}
              />
            </label>
          </section>

          {/* Class selector chips */}
          {classes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {classes.map((c) => {
                const active = selectedClass === c.class;
                return (
                  <button
                    key={c.class}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedClass(c.class)}
                    className={cn(
                      "min-h-8 md:min-h-9 px-3.5 rounded-full text-[12.5px] font-medium transition-colors cursor-pointer",
                      active
                        ? "bg-primary text-on-primary"
                        : "bg-surface border border-border text-text-primary hover:bg-surface-subtle",
                    )}
                  >
                    Lớp {c.class} ({c.students} HV)
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Sessions List */}
          {loadingSessions ? (
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-24 w-full" rounded="xl" />
              <Skeleton className="h-24 w-full" rounded="xl" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-surface border border-border rounded-[20px] p-6 text-center text-[13px] text-text-secondary">
              Chưa có buổi học nào cho lớp đang chọn. Hãy tải file thời khóa biểu ở trên.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {sessions.map((sess) => (
                <article
                  key={sess.id}
                  className="bg-surface border border-border rounded-[18px] p-4 shadow-card-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">{sess.kind || "Buổi học"}</Badge>
                      <span className="text-[12.5px] text-text-secondary tabular-nums inline-flex items-center gap-1">
                        <CalendarIcon size={13} />
                        {sess.date.split("-").reverse().join("/")}
                      </span>
                      <span className="text-[12.5px] font-medium text-text-primary tabular-nums inline-flex items-center gap-1">
                        <ClockIcon size={13} className="text-secondary" />
                        {sess.start} – {sess.end}
                      </span>
                    </div>
                    <h3 className="text-[14.5px] md:text-[15.5px] font-semibold text-text-primary">
                      {sess.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {sess.rooms.map((r) => (
                        <Badge key={r.code} variant="outline" size="sm">
                          {r.code} ({r.students} HV)
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={Boolean(staff?.must_change)}
                    onClick={() => openSessionEditor(sess)}
                  >
                    Đổi giờ / phòng
                  </Button>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* TAB 2: USERS & TEAMS */}
      {activeTab === "users" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col">
              <h2 className="text-[16px] font-semibold text-text-primary">
                Danh sách tài khoản Admin & Mentor ({users.length})
              </h2>
              <p className="text-[12.5px] text-text-secondary">
                Học viên không cần tài khoản để xem lịch; Admin chỉ quản lý tài khoản nhân sự và nhóm Mentor.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UserIcon size={15} />}
              disabled={Boolean(staff?.must_change)}
              onClick={() => setCreateUserOpen(true)}
            >
              Tạo tài khoản
            </Button>
          </div>

          {loadingUsers ? (
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-24 w-full" rounded="xl" />
              <Skeleton className="h-24 w-full" rounded="xl" />
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {users.map((u) => {
                const isSelf = u.id === staff?.id;
                return (
                  <article
                    key={u.id}
                    className="bg-surface border border-border rounded-[18px] p-4 shadow-card-sm flex flex-col gap-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={u.role === "admin" ? "primary" : "secondary"}>
                            {u.role === "admin" ? "Admin" : "Mentor"}
                          </Badge>
                          {u.disabled ? (
                            <Badge variant="danger">Đã khóa</Badge>
                          ) : u.must_change ? (
                            <Badge variant="warning">Chờ đổi mật khẩu</Badge>
                          ) : (
                            <Badge variant="success" dot>
                              Đang hoạt động
                            </Badge>
                          )}
                          {isSelf ? <Badge variant="outline">Bạn</Badge> : null}
                        </div>
                        <h3 className="text-[15px] font-semibold text-text-primary">
                          {u.display_name || u.username}{" "}
                          <span className="text-[13px] font-normal text-text-secondary">
                            (@{u.username})
                          </span>
                        </h3>
                        {u.role === "mentor" ? (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-[12px] text-text-secondary">Phụ trách:</span>
                            {u.teams.length > 0 ? (
                              u.teams.map((t) => (
                                <Badge key={t} variant="neutral" size="sm">
                                  {t}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-[12px] text-text-secondary italic">
                                Chưa gán nhóm
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/75">
                      {u.role === "mentor" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingTeamsUser(u);
                            setEditTeamsText(
                              u.teams.map((t) => t.replace(/^Nhóm\s*/i, "")).join(", "),
                            );
                          }}
                        >
                          Sửa nhóm
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleResetPassword(u)}
                      >
                        Đặt lại mật khẩu
                      </Button>
                      {!isSelf ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={u.disabled ? "" : "text-danger hover:bg-danger-background"}
                          onClick={() => void handleToggleDisable(u)}
                        >
                          {u.disabled ? "Mở khóa" : "Khóa tài khoản"}
                        </Button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* TAB 3: MENTOR DUTIES (ALL TEAMS) */}
      {activeTab === "duties" ? <MentorDashboard embedded /> : null}

      {/* Edit Session Drawer */}
      <Sheet
        open={Boolean(editingSession)}
        placement="drawer"
        size="sm"
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingSession(null);
        }}
        title="Sửa giờ / phòng buổi học"
        subtitle={
          editingSession
            ? `${editingSession.name} · Lớp ${editingSession.class}`
            : undefined
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setEditingSession(null)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={savingSession}
              onClick={handleSaveSession}
            >
              Lưu & gửi thông báo
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveSession} className="flex flex-col gap-3.5">
          <Input
            label="Ngày học"
            type="date"
            value={sessDate}
            onChange={(e) => setSessDate(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Giờ bắt đầu"
              type="time"
              value={sessStart}
              onChange={(e) => setSessStart(e.target.value)}
            />
            <Input
              label="Giờ kết thúc"
              type="time"
              value={sessEnd}
              onChange={(e) => setSessEnd(e.target.value)}
            />
          </div>

          {editingSession && editingSession.rooms.length > 0 ? (
            <div className="p-3.5 rounded-[14px] bg-surface-subtle border border-border flex flex-col gap-2.5">
              <span className="text-[12.5px] font-semibold text-text-primary">
                Chuyển phòng học (tùy chọn)
              </span>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-room-from"
                  className="text-[12px] font-medium text-text-primary"
                >
                  Từ phòng
                </label>
                <select
                  id="admin-room-from"
                  value={roomFrom}
                  onChange={(e) => setRoomFrom(e.target.value)}
                  className="w-full min-h-10 rounded-[14px] border border-border bg-surface px-3 text-[13.5px] text-text-primary"
                >
                  <option value="">-- Không đổi phòng --</option>
                  {editingSession.rooms.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.code} ({r.students} học viên)
                    </option>
                  ))}
                </select>
              </div>
              {roomFrom ? (
                <Input
                  label="Sang phòng mới (ví dụ: E305)"
                  value={roomTo}
                  onChange={(e) => setRoomTo(e.target.value.toUpperCase())}
                  placeholder="E305"
                />
              ) : null}
            </div>
          ) : null}

          <Input
            label="Ghi chú thông báo tới học viên"
            value={sessNote}
            onChange={(e) => setSessNote(e.target.value)}
            placeholder="Ví dụ: Đổi phòng do bảo trì máy chiếu"
          />
        </form>
      </Sheet>

      {/* Create User Modal */}
      <Sheet
        open={createUserOpen}
        placement="modal"
        size="md"
        onOpenChange={setCreateUserOpen}
        title="Tạo tài khoản nhân sự mới"
        subtitle="Người dùng mới sẽ được yêu cầu đổi mật khẩu tạm sau khi đăng nhập lần đầu."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="md" onClick={() => setCreateUserOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={savingUser}
              onClick={handleCreateUser}
            >
              Tạo tài khoản
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateUser} className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={newRole === "mentor"}
              onClick={() => setNewRole("mentor")}
              className={cn(
                "min-h-10 rounded-full border text-[13px] font-medium cursor-pointer",
                newRole === "mentor"
                  ? "bg-sage-background border-olive text-on-sage"
                  : "bg-background border-border text-text-secondary",
              )}
            >
              Mentor / Lab Coach
            </button>
            <button
              type="button"
              aria-pressed={newRole === "admin"}
              onClick={() => setNewRole("admin")}
              className={cn(
                "min-h-10 rounded-full border text-[13px] font-medium cursor-pointer",
                newRole === "admin"
                  ? "bg-sage-background border-olive text-on-sage"
                  : "bg-background border-border text-text-secondary",
              )}
            >
              Admin
            </button>
          </div>

          <Input
            label="Tên đăng nhập (username)"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Ví dụ: mentor.b"
          />
          <Input
            label="Tên hiển thị"
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
            placeholder="Ví dụ: Nguyễn Văn B"
          />
          <Input
            label="Mật khẩu tạm (≥ 8 ký tự)"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Ít nhất 8 ký tự"
          />
          {newRole === "mentor" ? (
            <Input
              label="Nhóm phụ trách (cách nhau bởi dấu phẩy)"
              value={newTeamsText}
              onChange={(e) => setNewTeamsText(e.target.value)}
              placeholder="Ví dụ: 10, 11, 12"
            />
          ) : null}
        </form>
      </Sheet>

      {/* Edit Mentor Teams Modal */}
      <Dialog
        open={Boolean(editingTeamsUser)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingTeamsUser(null);
        }}
        title={
          editingTeamsUser
            ? `Sửa nhóm phụ trách · ${editingTeamsUser.display_name || editingTeamsUser.username}`
            : "Sửa nhóm"
        }
        description="Nhập các số nhóm cách nhau bằng dấu phẩy (ví dụ: 10, 11, 12)."
        footer={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => setEditingTeamsUser(null)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={savingTeams}
              onClick={handleSaveTeams}
            >
              Lưu nhóm
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveTeams}>
          <Input
            label="Danh sách nhóm"
            value={editTeamsText}
            onChange={(e) => setEditTeamsText(e.target.value)}
            placeholder="10, 11, 12"
          />
        </form>
      </Dialog>

      {/* Reset Password Result Dialog */}
      <Dialog
        open={Boolean(resetResult)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setResetResult(null);
        }}
        title={resetResult ? `Mật khẩu tạm cho @${resetResult.username}` : "Mật khẩu tạm"}
        description={resetResult?.note}
        footer={
          <>
            <Button
              variant="outline"
              size="md"
              leftIcon={<CopyIcon size={15} />}
              onClick={async () => {
                if (!resetResult) return;
                try {
                  await navigator.clipboard.writeText(resetResult.password);
                  showToast("Đã sao chép mật khẩu tạm.", "success");
                } catch {
                  showToast("Không thể sao chép tự động.", "warning");
                }
              }}
            >
              Sao chép
            </Button>
            <Button variant="primary" size="md" onClick={() => setResetResult(null)}>
              Đóng
            </Button>
          </>
        }
      >
        {resetResult ? (
          <div className="p-3.5 rounded-[14px] bg-surface-subtle border border-border text-center font-mono text-[16px] font-semibold tracking-wider text-text-primary select-all">
            {resetResult.password}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
