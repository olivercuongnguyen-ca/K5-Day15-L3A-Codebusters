"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/data/mock-accounts";
import { api } from "@/lib/backend";
import {
  Badge,
  Button,
  CalendarIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  IdCardIcon,
  InfoIcon,
  Input,
  LockIcon,
  SchoolIcon,
  ShieldIcon,
  Tabs,
} from "@/components/ui";
import { useApp } from "@/components/app/app-provider";

function UserIconSlot() {
  return <IdCardIcon size={18} />;
}

export function LoginView() {
  const router = useRouter();
  const { enterStudent, staffLogin, showToast } = useApp();

  const [role, setRole] = useState<UserRole>("student");
  const [studentCode, setStudentCode] = useState("");
  const [squad, setSquad] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState<{ timetable: boolean; students: number } | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | undefined>();

  useEffect(() => {
    api<{ timetable: boolean; students: number }>("/api/setup/status").then(setSetup).catch(() => setSetup(null));
  }, []);

  function handleRoleChange(nextValue: string) {
    setRole(nextValue as UserRole);
    setErrorMessage(undefined);
    setShowPassword(false);
    setPassword("");
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploadMsg("Đang đọc file…");
    try {
      const r = await api<{ students: number; new: boolean }>("/api/setup/timetable", { method: "POST", body: fd });
      setUploadMsg(`Đã tải thời khoá biểu: ${r.students} học viên. Giờ nhập mã học viên của bạn.`);
      setSetup({ timetable: true, students: r.students });
    } catch (err) {
      setUploadMsg((err as Error).message);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(undefined);
    setBusy(true);
    try {
      if (role === "student") {
        if (!studentCode.trim()) {
          setErrorMessage("Vui lòng nhập mã học viên để tiếp tục.");
          return;
        }
        const me = await enterStudent(studentCode.trim(), squad.trim());
        showToast(`Đã mở lịch của ${me.short_name || me.student_id} · lớp ${me.class}`, "success");
        router.push("/");
        return;
      }
      if (!email.trim() || !password) {
        setErrorMessage("Vui lòng nhập tên đăng nhập và mật khẩu.");
        return;
      }
      const me = await staffLogin(email.trim(), password);
      if (me.role !== role) showToast(`Tài khoản này là ${me.role === "admin" ? "Admin" : "Mentor"}.`, "info");
      showToast(`Đã đăng nhập · ${me.display_name}`, "success");
      router.push("/");
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background text-text-primary flex flex-col justify-center px-4 py-6 md:px-5 md:py-8 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-[460px] mx-auto flex flex-col gap-4 md:gap-6">
        {/* Brand Header */}
        <header className="flex flex-col items-center text-center gap-2 md:gap-2.5">
          <div className="flex items-center gap-2 md:gap-2.5">
            <span className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-primary text-on-primary shadow-[0_4px_14px_rgba(92,67,117,0.22)] inline-flex items-center justify-center">
              <CalendarIcon size={18} className="md:w-[22px] md:h-[22px]" />
            </span>
            <span className="text-[18px] leading-[24px] md:text-[20px] md:leading-[28px] font-semibold text-text-primary">
              Unify
            </span>
          </div>

          <div className="flex flex-col items-center gap-1 md:gap-1.5">
            <Badge variant="secondary" size="sm">
              Lịch AI20K
            </Badge>
            <h1 className="text-[20px] leading-[28px] md:text-[24px] md:leading-[32px] font-semibold tracking-[-0.2px] text-text-primary text-balance">
              Đăng nhập theo vai trò
            </h1>
            <p className="text-[13px] leading-[19px] md:text-[14px] md:leading-[21px] text-text-secondary max-w-sm text-pretty">
              Học viên chỉ cần mã học viên. Mentor và admin đăng nhập bằng
              tài khoản do ban đào tạo cấp.
            </p>
          </div>
        </header>

        {/* Main Card */}
        <main className="bg-surface border border-border rounded-[20px] md:rounded-[24px] p-4 sm:p-6 shadow-card flex flex-col gap-4 md:gap-5">
          <Tabs
            ariaLabel="Chọn vai trò đăng nhập"
            value={role}
            onValueChange={handleRoleChange}
            items={[
              {
                value: "student",
                label: "Học viên",
                icon: <IdCardIcon size={16} />,
              },
              {
                value: "mentor",
                label: "Mentor / Coach",
                icon: <SchoolIcon size={16} />,
              },
              {
                value: "admin",
                label: "Admin",
                icon: <ShieldIcon size={16} />,
              },
            ]}
          />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {role === "student" ? (
              <>
                <div className="p-3.5 rounded-[16px] bg-surface-subtle border border-border flex items-start gap-2.5">
                  <InfoIcon
                    size={18}
                    className="text-primary shrink-0 mt-0.5"
                  />
                  <span className="text-[13px] leading-[19px] text-text-secondary">
                    Học viên chỉ cần nhập <strong className="font-medium text-text-primary">Mã học viên</strong> để xem lịch học hợp nhất từ Outlook, Phoenix và .ics.
                  </span>
                </div>

                <Input
                  label="Mã học viên"
                  name="studentCode"
                  type="text"
                  autoComplete="username"
                  tabularNums
                  value={studentCode}
                  onChange={(e) => {
                    setStudentCode(e.target.value);
                    if (errorMessage) setErrorMessage(undefined);
                  }}
                  placeholder="Ví dụ: 2A2026xxxxx"
                  leftIcon={<IdCardIcon size={18} />}
                  error={errorMessage}
                  helperText={
                    !errorMessage
                      ? "Không phân biệt chữ hoa hay chữ thường."
                      : undefined
                  }
                />

                <Input
                  label="Mã team 4 người (không bắt buộc)"
                  name="squad"
                  type="text"
                  maxLength={40}
                  value={squad}
                  onChange={(e) => setSquad(e.target.value)}
                  placeholder="Ví dụ: T050"
                  helperText="Dùng để họp team. Nhóm mentor tự lấy từ Phoenix."
                />

                {setup && !setup.timetable ? (
                  <div className="p-3.5 rounded-[16px] bg-warning-background text-on-warning flex flex-col gap-2">
                    <span className="text-[13px] leading-[19px] font-semibold">
                      Lần chạy đầu: app chưa có thời khoá biểu
                    </span>
                    <span className="text-[12.5px] leading-[18px]">
                      Tải file đính kèm <code>Thoi_khoa_bieu_….html</code> từ email lịch học hằng tuần. File chỉ
                      lưu trên máy chủ của app.
                    </span>
                    <input
                      type="file"
                      accept=".html,.htm,.eml"
                      aria-label="File thời khoá biểu"
                      onChange={(e) => void handleUpload(e.target.files?.[0])}
                      className="text-[12.5px]"
                    />
                    {uploadMsg ? <span className="text-[12.5px]" role="status">{uploadMsg}</span> : null}
                  </div>
                ) : null}

                <Button type="submit" variant="primary" size="lg" fullWidth disabled={busy}>
                  Tiếp tục với mã học viên
                </Button>
              </>
            ) : (
              <>
                <div className="p-3.5 rounded-[16px] bg-surface-subtle border border-border flex items-start gap-2.5">
                  <LockIcon
                    size={18}
                    className="text-primary shrink-0 mt-0.5"
                  />
                  <span className="text-[13px] leading-[19px] text-text-secondary">
                    {role === "mentor"
                      ? "Mentor đăng nhập để xem và đổi lịch mentor duty của nhóm mình phụ trách."
                      : "Admin đăng nhập để cập nhật thời khoá biểu và quản lý tài khoản mentor."}
                  </span>
                </div>

                <Input
                  label="Tên đăng nhập"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(undefined);
                  }}
                  placeholder={role === "mentor" ? "vd mentor.a" : "vd giaovu"}
                  leftIcon={<UserIconSlot />}
                />

                <Input
                  label="Mật khẩu"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(undefined);
                  }}
                  placeholder="Mật khẩu"
                  leftIcon={<LockIcon size={18} />}
                  error={errorMessage}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-background border border-border text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  }
                />

                <Button type="submit" variant="primary" size="lg" fullWidth disabled={busy}>
                  {role === "mentor"
                    ? "Đăng nhập Mentor / Lab Coach"
                    : "Đăng nhập Admin"}
                </Button>
              </>
            )}
          </form>
        </main>

        {/* Footer links */}
        <footer className="flex flex-wrap items-center justify-center gap-4 text-[13px]">
          <Link
            href="/"
            className="inline-flex items-center gap-1 min-h-11 px-4 rounded-full text-primary font-medium hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span>Về trang lịch</span>
            <ChevronRightIcon size={16} />
          </Link>
        </footer>
      </div>
    </div>
  );
}
