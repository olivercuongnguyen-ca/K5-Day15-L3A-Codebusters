"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  authenticateStaffAccount,
  authenticateStudentCode,
  getAccountsByRole,
  type UserRole,
} from "@/data/mock-accounts";
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
  MailIcon,
  SchoolIcon,
  ShieldIcon,
  Tabs,
} from "@/components/ui";
import { useApp } from "@/components/app/app-provider";

export function LoginView() {
  const router = useRouter();
  const { setCurrentUser, showToast } = useApp();

  const [role, setRole] = useState<UserRole>("student");
  const [studentCode, setStudentCode] = useState("HV202601");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const studentAccounts = getAccountsByRole("student");
  const mentorAccounts = getAccountsByRole("mentor");
  const adminAccounts = getAccountsByRole("admin");

  function handleRoleChange(nextValue: string) {
    const nextRole = nextValue as UserRole;
    setRole(nextRole);
    setErrorMessage(undefined);
    setShowPassword(false);

    if (nextRole === "student") {
      setStudentCode("HV202601");
    } else if (nextRole === "mentor") {
      setEmail("quan.mentor@unify.edu.vn");
      setPassword("mentor123");
    } else {
      setEmail("admin@unify.edu.vn");
      setPassword("admin123");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(undefined);

    if (role === "student") {
      if (!studentCode.trim()) {
        setErrorMessage("Vui lòng nhập mã học viên để tiếp tục.");
        return;
      }
      const matched = authenticateStudentCode(studentCode);
      if (!matched) {
        setErrorMessage(
          "Không tìm thấy mã học viên trong dữ liệu mẫu (thử HV202601 hoặc HV202602).",
        );
        return;
      }
      setCurrentUser(matched);
      showToast(
        `Đã đăng nhập bản demo · ${matched.name} (${matched.roleLabel})`,
        "success",
      );
      router.push("/");
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage("Vui lòng nhập đầy đủ tài khoản email và mật khẩu.");
      return;
    }

    const matched = authenticateStaffAccount(role, email, password);
    if (!matched) {
      setErrorMessage(
        "Tài khoản hoặc mật khẩu chưa khớp với dữ liệu mẫu của vai trò này.",
      );
      return;
    }

    setCurrentUser(matched);
    showToast(
      `Đã đăng nhập bản demo · ${matched.name} (${matched.roleLabel})`,
      "success",
    );
    router.push("/");
  }

  const activeStaffSamples =
    role === "mentor" ? mentorAccounts : role === "admin" ? adminAccounts : [];

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
              Dữ liệu mẫu · Bản demo
            </Badge>
            <h1 className="text-[20px] leading-[28px] md:text-[24px] md:leading-[32px] font-semibold tracking-[-0.2px] text-text-primary text-balance">
              Đăng nhập theo vai trò
            </h1>
            <p className="text-[13px] leading-[19px] md:text-[14px] md:leading-[21px] text-text-secondary max-w-sm text-pretty">
              Chọn danh mục phù hợp để trải nghiệm giao diện với bộ tài khoản
              mẫu, chưa kết nối xác thực thật.
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
                  placeholder="Ví dụ: HV202601"
                  leftIcon={<IdCardIcon size={18} />}
                  error={errorMessage}
                  helperText={
                    !errorMessage
                      ? "Không phân biệt chữ hoa hay chữ thường."
                      : undefined
                  }
                />

                {/* Sample student codes */}
                <div className="flex flex-col gap-2">
                  <span className="text-[12px] font-medium text-text-secondary">
                    Mã học viên mẫu (chạm để điền nhanh):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {studentAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          setStudentCode(acc.studentCode ?? "");
                          setErrorMessage(undefined);
                        }}
                        className="inline-flex items-center gap-1.5 min-h-9 px-3.5 rounded-full bg-background border border-border text-[12px] font-medium text-text-primary hover:bg-surface-subtle transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <span className="font-semibold tabular-nums">
                          {acc.studentCode}
                        </span>
                        <span className="text-text-secondary">· {acc.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button type="submit" variant="primary" size="lg" fullWidth>
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
                      ? "Tài khoản Mentor / Lab Coach cần email và mật khẩu để truy cập lịch coaching và trực hỗ trợ."
                      : "Tài khoản Admin cần email và mật khẩu quản trị để kiểm tra cấu hình và nguồn dữ liệu."}
                  </span>
                </div>

                <Input
                  label="Email tài khoản"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(undefined);
                  }}
                  placeholder={
                    role === "mentor"
                      ? "quan.mentor@unify.edu.vn"
                      : "admin@unify.edu.vn"
                  }
                  leftIcon={<MailIcon size={18} />}
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
                  placeholder="Nhập mật khẩu mẫu"
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

                {/* Sample staff accounts */}
                <div className="flex flex-col gap-2">
                  <span className="text-[12px] font-medium text-text-secondary">
                    Tài khoản mẫu (chạm để điền nhanh):
                  </span>
                  <div className="flex flex-col gap-2">
                    {activeStaffSamples.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          setEmail(acc.email);
                          setPassword(acc.password ?? "");
                          setErrorMessage(undefined);
                        }}
                        className="w-full text-left px-3.5 py-2.5 rounded-[14px] bg-background border border-border hover:bg-surface-subtle transition-colors flex items-center justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-semibold text-text-primary truncate">
                            {acc.name} · {acc.roleLabel}
                          </span>
                          <span className="text-[12px] text-text-secondary truncate tabular-nums">
                            {acc.email} · MK: {acc.password}
                          </span>
                        </div>
                        <ChevronRightIcon
                          size={16}
                          className="text-text-secondary shrink-0"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <Button type="submit" variant="primary" size="lg" fullWidth>
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
            <span>Xem lịch ngay không cần đăng nhập</span>
            <ChevronRightIcon size={16} />
          </Link>
        </footer>
      </div>
    </div>
  );
}
