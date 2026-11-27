"use client";

import { useEffect, useState } from "react";
import type { CalendarSource } from "@/data/mock-schedule";
import { api, post, type StudentMe } from "@/lib/backend";
import {
  Badge,
  Button,
  CalendarIcon,
  ClockIcon,
  CloudOffIcon,
  CopyIcon,
  Dialog,
  InfoIcon,
  Input,
  LinkIcon,
  LockIcon,
  LogOutIcon,
  MailIcon,
  RefreshIcon,
  SchoolIcon,
  Sheet,
  SourceCardSkeleton,
} from "@/components/ui";
import { useApp, useHydrated } from "@/components/app/app-provider";

const PHOENIX_URL = "https://portal-cohort5.edufun.ai/";
const PHOENIX_STEPS = [
  "Mở Phoenix và đăng nhập.",
  "Vào “Lịch sự kiện”.",
  "Bấm “Nhắc lịch qua Google Calendar”.",
  "Sao chép link .ics ở đó, dán vào ô bên dưới rồi bấm Kết nối.",
];

const GOOGLE_CALENDAR_STEPS = [
  "Mở Google Calendar trên máy tính.",
  "Chọn dấu cộng cạnh mục “Lịch khác”.",
  "Chọn “Từ URL” và dán liên kết lịch phía trên.",
  "Thêm thông báo nhắc lịch trong cài đặt của lịch vừa đăng ký.",
];

function renderSourceIcon(id: CalendarSource["id"]) {
  if (id === "outlook") {
    return (
      <span className="w-9 h-9 md:w-11 md:h-11 rounded-[12px] md:rounded-[16px] bg-sage-background text-on-sage inline-flex items-center justify-center shrink-0">
        <MailIcon size={18} className="md:w-[21px] md:h-[21px]" />
      </span>
    );
  }
  if (id === "phoenix") {
    return (
      <span className="w-9 h-9 md:w-11 md:h-11 rounded-[12px] md:rounded-[16px] bg-warning-background text-on-warning inline-flex items-center justify-center shrink-0">
        <SchoolIcon size={18} className="md:w-[21px] md:h-[21px]" />
      </span>
    );
  }
  return (
    <span className="w-9 h-9 md:w-11 md:h-11 rounded-[12px] md:rounded-[16px] bg-surface-subtle text-text-primary inline-flex items-center justify-center shrink-0">
      <LinkIcon size={18} className="md:w-[21px] md:h-[21px]" />
    </span>
  );
}

function renderStatusBadge(source: CalendarSource) {
  if (source.status === "connected") {
    return (
      <Badge variant="success" dot>
        {source.statusLabel}
      </Badge>
    );
  }
  if (source.status === "needs_reconnect") {
    return <Badge variant="warning">{source.statusLabel}</Badge>;
  }
  return <Badge variant="outline">{source.statusLabel}</Badge>;
}

export function SettingsView() {
  const {
    currentUser,
    showToast,
    schedule,
    student,
    staff,
    setStudent,
    logout,
  } = useApp();
  const [calLinks, setCalLinks] = useState<{ ics: string; google: string; outlook: string } | null>(null);
  useEffect(() => {
    if (!student) return;
    api<{ ics: string; google: string; outlook: string }>("/api/calendar-links").then(setCalLinks).catch(() => setCalLinks(null));
  }, [student]);
  const hydrated = useHydrated();
  const maskedIcsUrl = calLinks ? calLinks.ics.replace(/\/cal\/(.{6}).*(.{4})\.ics$/, "/cal/$1••••••$2.ics") : "Đang tạo liên kết…";

  const [squadDraft, setSquadDraft] = useState<string | null>(null);  // null = show the saved team name
  const squadInput = squadDraft ?? (student?.squad ?? "");

  async function handleSaveSquad() {
    try {
      const me = await post<StudentMe>("/api/student/squad", { squad: squadInput.trim() }, "PUT");
      setStudent({ ...student!, ...me });
      setSquadDraft(null);
      schedule.reload();
      showToast(me.squad ? `Đã lưu team: ${me.squad}` : "Đã xoá tên team", "success");
    } catch (err) {
      showToast((err as Error).message, "danger");
    }
  }

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [icsSheetOpen, setIcsSheetOpen] = useState(false);
  const [demoDialogSource, setDemoDialogSource] =
    useState<CalendarSource | null>(null);
  const [icsUrl, setIcsUrl] = useState("");
  const [icsTouched, setIcsTouched] = useState(false);

  const trimmedIcs = icsUrl.trim();
  const icsInvalid =
    icsTouched &&
    (trimmedIcs.length === 0 ||
      !trimmedIcs.startsWith("https://") ||
      !trimmedIcs.includes("/api/events/feed/") ||
      !trimmedIcs.toLowerCase().endsWith(".ics"));

  async function handleCopyIcsLink() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        if (calLinks) await navigator.clipboard.writeText(calLinks.ics);
      }
    } catch {
      // Fallback safely in restricted contexts while keeping UX honest
    }
    showToast(calLinks ? "Đã sao chép liên kết lịch của bạn" : "Chưa có liên kết lịch", calLinks ? "success" : "warning");
  }

  function handleConfirmRotate() {
    setResetDialogOpen(false);
    if (calLinks) window.open(calLinks.google, "_blank", "noopener,noreferrer");
  }

  function handleSourceAction(source: CalendarSource) {
    if (source.id === "phoenix") {
      setIcsUrl("");
      setIcsTouched(false);
      setIcsSheetOpen(true);
      return;
    }
    if (source.id === "ics") {
      document.getElementById("google-calendar")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    showToast(source.lastUpdatedLabel, "info");  // timetable: when the current version arrived
  }

  async function handleIcsSubmit() {
    setIcsTouched(true);
    if (
      trimmedIcs.length === 0 ||
      !trimmedIcs.startsWith("https://") ||
      !trimmedIcs.includes("/api/events/feed/") ||
      !trimmedIcs.toLowerCase().endsWith(".ics")
    ) {
      return;
    }
    try {
      const r = await post<{ events: number }>("/api/phoenix", { url: trimmedIcs });
      setIcsSheetOpen(false);
      setIcsUrl("");
      schedule.reload();
      showToast(`Đã kết nối lịch Phoenix: ${r.events} sự kiện.`, "success");
    } catch (err) {
      showToast((err as Error).message, "danger");
    }
  }

  if (!hydrated) return <div aria-busy="true" className="min-h-[60dvh]" />;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <header className="flex flex-col gap-0.5">
        <h1 className="text-[20px] leading-[26px] md:text-[26px] md:leading-[34px] font-semibold tracking-[-0.2px] text-text-primary">
          Cài đặt
        </h1>
        <p className="text-[12px] leading-[18px] md:text-[13px] md:leading-[20px] text-text-secondary">
          Thông tin học viên, nguồn lịch và liên kết Google Calendar
        </p>
      </header>

      {/* Profile Card: Họ và tên + MSSV */}
      <section
        aria-label="Hồ sơ người dùng"
        className="bg-surface border border-border rounded-[20px] md:rounded-[24px] p-4 md:p-5 shadow-card-sm flex items-center justify-between gap-3 md:gap-4 flex-wrap"
      >
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <div
            aria-hidden="true"
            className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-primary-container text-on-primary-container text-[15px] md:text-[18px] font-semibold inline-flex items-center justify-center shrink-0 border border-primary/15"
          >
            {currentUser.initials}
          </div>
          <div className="flex flex-col gap-0.5 md:gap-1 min-w-0">
            <h2 className="text-[15px] leading-[21px] md:text-[17px] md:leading-[24px] font-semibold text-text-primary">
              {currentUser.name}
            </h2>
            <p className="text-[13px] leading-[18px] md:text-[14px] md:leading-[20px] text-text-secondary tabular-nums">
              {currentUser.studentCode
                ? `MSSV: ${currentUser.studentCode}`
                : `${currentUser.roleLabel} · ${currentUser.email}`}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <Badge variant="secondary">{currentUser.roleLabel}</Badge>
              <Badge variant="neutral">{currentUser.subtitle}</Badge>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void logout()}
        >
          Đổi tài khoản
        </Button>
      </section>

      {student ? (
        <section
          aria-label="Nhóm mentor"
          className="bg-surface border border-border rounded-[20px] md:rounded-[24px] p-4 md:p-5 shadow-card-sm flex flex-col gap-3"
        >
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[15px] leading-[21px] md:text-[17px] md:leading-[24px] font-semibold text-text-primary">
              Nhóm mentor
            </h2>
            <p className="text-[13px] leading-[19px] text-text-secondary">
              {student.team
                ? `Bạn thuộc ${student.team} (lấy từ lịch Phoenix). Nhóm gồm nhiều team do một mentor phụ trách; lịch mentor duty theo nhóm này.`
                : "Chưa biết nhóm mentor. App tự lấy từ lịch mentor duty trên Phoenix sau khi bạn kết nối Phoenix và được chia nhóm."}
            </p>
          </div>
        </section>
      ) : null}

      {student ? (
        <section
          aria-label="Team của bạn"
          className="bg-surface border border-border rounded-[20px] md:rounded-[24px] p-4 md:p-5 shadow-card-sm flex flex-col gap-3"
        >
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[15px] leading-[21px] md:text-[17px] md:leading-[24px] font-semibold text-text-primary">
              Team của bạn
            </h2>
            <p className="text-[13px] leading-[19px] text-text-secondary">
              {student.squad
                ? `Bạn ở team ${student.squad}. Lịch họp team chỉ dành cho các bạn cùng tên team này.`
                : "Chưa có team. Nhập mã team 4 người của bạn để đặt và xem lịch họp team."}
            </p>
          </div>
          <Input
            label="Mã team"
            type="text"
            maxLength={40}
            value={squadInput}
            onChange={(e) => setSquadDraft(e.target.value)}
            placeholder="Ví dụ: T050"
            helperText="Cả team nhập cùng một mã (không phân biệt hoa thường). Để trống rồi lưu để xoá."
            rightSlot={
              <Button variant="primary" size="md" onClick={() => void handleSaveSquad()}>
                Lưu
              </Button>
            }
          />
        </section>
      ) : null}

      {staff ? (
        <section
          aria-label="Công cụ quản trị"
          className="bg-surface border border-border rounded-[20px] md:rounded-[24px] p-4 md:p-5 shadow-card-sm flex flex-col gap-2"
        >
          <h2 className="text-[15px] leading-[21px] md:text-[17px] md:leading-[24px] font-semibold text-text-primary">
            {staff.role === "admin" ? "Công cụ admin" : `Nhóm phụ trách: ${staff.teams.join(", ") || "chưa gán"}`}
          </h2>
          <p className="text-[13px] leading-[19px] text-text-secondary">
            {staff.role === "admin"
              ? "Cập nhật thời khoá biểu, sửa buổi học và quản lý tài khoản mentor qua API của app."
              : "Xem và đổi ca mentor duty của nhóm qua API của app; học viên trong nhóm sẽ nhận thông báo."}{" "}
            <a className="text-secondary underline" href="/docs" target="_blank" rel="noopener noreferrer">Mở tài liệu API</a>
          </p>
        </section>
      ) : null}

      {/* Integrated Sources Section (#nguon-lich) */}
      <section
        id="nguon-lich"
        aria-labelledby="sources-section-heading"
        className="flex flex-col gap-3 md:gap-3.5"
      >
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex flex-col">
            <h2
              id="sources-section-heading"
              className="text-[16px] leading-[22px] md:text-[18px] md:leading-[26px] font-semibold text-text-primary"
            >
              Nguồn lịch
            </h2>
            <p className="text-[12px] leading-[18px] md:text-[13px] md:leading-[19px] text-text-secondary">
              Thời khoá biểu từ email ban đào tạo, Phoenix của bạn, và đồng bộ ra lịch cá nhân
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshIcon size={15} />}
            onClick={() => {
              schedule.reload();
              showToast("Đang tải lại lịch…", "info");
            }}
          >
            Đồng bộ tất cả
          </Button>
        </div>

        <div className="flex items-start gap-2.5 p-3 md:p-3.5 rounded-[14px] md:rounded-[16px] bg-surface-subtle border border-border text-text-primary">
          <InfoIcon size={16} className="text-primary shrink-0 mt-0.5 md:w-[18px] md:h-[18px]" />
          <span className="text-[12px] leading-[18px] md:text-[13px] md:leading-[19px] text-text-secondary text-pretty">
            Phoenix tự cập nhật mỗi giờ. Link Phoenix là riêng tư: app chỉ dùng để đọc lịch của bạn, không
            hiển thị lại và không gửi cho AI.
          </span>
        </div>

        {schedule.sources.length === 0 ? (
          <div className="flex flex-col gap-2.5 md:gap-3" aria-busy="true">
            <SourceCardSkeleton />
            <SourceCardSkeleton />
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 md:gap-3">
            {schedule.sources.map((source) => (
              <article
                key={source.id}
                className="bg-surface border border-border rounded-[20px] md:rounded-[24px] p-4 md:p-5 shadow-card-sm flex flex-col gap-3 md:gap-3.5"
              >
                <div className="flex items-start justify-between gap-2.5 md:gap-3">
                  <div className="flex items-start gap-2.5 md:gap-3 min-w-0">
                    {renderSourceIcon(source.id)}
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <h3 className="text-[14.5px] leading-[20px] md:text-[16px] md:leading-[24px] font-semibold text-text-primary">
                        {source.name}
                      </h3>
                      <p className="text-[12px] leading-[18px] md:text-[13px] md:leading-[19px] text-text-secondary text-pretty">
                        {source.description}
                      </p>
                    </div>
                  </div>
                  {renderStatusBadge(source)}
                </div>

                {source.errorBanner ? (
                  <div
                    role="alert"
                    className="flex items-start gap-2 p-3 md:p-3.5 rounded-[14px] md:rounded-[16px] bg-danger-background text-on-danger-background"
                  >
                    <CloudOffIcon size={16} className="shrink-0 mt-0.5 md:w-[18px] md:h-[18px]" />
                    <span className="text-[12px] leading-[18px] md:text-[13px] md:leading-[19px]">
                      {source.errorBanner}
                    </span>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-2.5 md:gap-3 pt-2.5 md:pt-3 border-t border-border">
                  <span className="text-[12px] leading-[18px] md:text-[13px] md:leading-[20px] text-text-secondary">
                    {source.lastUpdatedLabel}
                  </span>
                  <Button
                    variant={
                      source.status === "connected" ? "outline" : "primary"
                    }
                    size="sm"
                    onClick={() => handleSourceAction(source)}
                  >
                    {source.actionLabel}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}

      </section>

      {/* Google Calendar Integration Guide */}
      <section
        id="google-calendar"
        aria-labelledby="google-calendar-heading"
        className="bg-surface border border-border rounded-[20px] md:rounded-[24px] p-4 sm:p-6 shadow-card flex flex-col gap-4 md:gap-5"
      >
        <div className="flex items-start gap-2.5 md:gap-3">
          <span className="w-9 h-9 md:w-10 md:h-10 rounded-[12px] md:rounded-[14px] bg-primary-container text-on-primary-container inline-flex items-center justify-center shrink-0 mt-0.5">
            <CalendarIcon size={18} className="md:w-5 md:h-5" />
          </span>
          <div className="flex flex-col gap-0.5 md:gap-1">
            <h2
              id="google-calendar-heading"
              className="text-[16px] leading-[22px] md:text-[18px] md:leading-[26px] font-semibold text-text-primary"
            >
              Mang lịch học vào Google Calendar
            </h2>
            <p className="text-[13px] leading-[19px] md:text-[14px] md:leading-[21px] text-text-secondary text-pretty">
              Đăng ký liên kết lịch cá nhân để thấy lịch học, phòng, mentor duty, họp team và
              hạn nộp ngay trong Google Calendar hoặc Outlook.
            </p>
          </div>
        </div>

        <Input
          label="Liên kết đăng ký lịch (.ics) của bạn"
          type="text"
          readOnly
          tabularNums
          value={maskedIcsUrl}
          helperText="Riêng cho bạn. Không có link Zoom hay link Phoenix trong lịch này."
          rightSlot={
            <Button
              variant="primary"
              size="md"
              leftIcon={<CopyIcon size={16} />}
              onClick={handleCopyIcsLink}
            >
              Sao chép
            </Button>
          }
        />

        {/* 4 Steps */}
        <div className="p-3.5 md:p-4 rounded-[16px] md:rounded-[20px] bg-background border border-border flex flex-col gap-2.5 md:gap-3">
          <h3 className="text-[14px] leading-[20px] md:text-[15px] md:leading-[22px] font-semibold text-text-primary">
            Cách thêm trên máy tính
          </h3>
          <ol className="flex flex-col gap-2 md:gap-2.5">
            {GOOGLE_CALENDAR_STEPS.map((step, index) => (
              <li key={step} className="flex items-start gap-2.5 md:gap-3">
                <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-sage-background text-on-sage text-[11px] md:text-[12px] font-semibold inline-flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                  {index + 1}
                </span>
                <span className="text-[13px] leading-[19px] md:text-[14px] md:leading-[21px] text-text-primary">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* 3 Honest Notes */}
        <div className="flex flex-col gap-2 md:gap-2.5">
          <div className="flex items-start gap-2 md:gap-2.5 p-3 md:p-3.5 rounded-[14px] md:rounded-[16px] bg-warning-background text-on-warning">
            <InfoIcon size={16} className="shrink-0 mt-0.5 md:w-[18px] md:h-[18px]" />
            <p className="text-[12px] leading-[18px] md:text-[13px] md:leading-[19px]">
              Chọn <strong>Từ URL</strong> để lịch tiếp tục cập nhật. Nhập tệp
              chỉ sao chép lịch một lần.
            </p>
          </div>
          <div className="flex items-start gap-2 md:gap-2.5 p-3 md:p-3.5 rounded-[14px] md:rounded-[16px] bg-background border border-border text-text-secondary">
            <ClockIcon size={16} className="shrink-0 mt-0.5 md:w-[18px] md:h-[18px]" />
            <p className="text-[12px] leading-[18px] md:text-[13px] md:leading-[19px]">
              Google Calendar có thể mất vài giờ để hiển thị các thay đổi mới.
            </p>
          </div>
          <div className="flex items-start gap-2 md:gap-2.5 p-3 md:p-3.5 rounded-[14px] md:rounded-[16px] bg-background border border-border text-text-secondary">
            <LockIcon size={16} className="shrink-0 mt-0.5 md:w-[18px] md:h-[18px]" />
            <p className="text-[12px] leading-[18px] md:text-[13px] md:leading-[19px]">
              Ai có liên kết đều có thể xem lịch. Hãy giữ liên kết riêng tư.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="lg"
          fullWidth
          className="text-danger hover:bg-danger-background hover:border-danger/30"
          onClick={() => calLinks && window.open(calLinks.google, "_blank", "noopener,noreferrer")}
        >
          Thêm vào Google Calendar
        </Button>
        <Button
          variant="outline"
          size="lg"
          fullWidth
          onClick={() => calLinks && window.open(calLinks.outlook, "_blank", "noopener,noreferrer")}
        >
          Thêm vào Outlook
        </Button>
      </section>

      {/* Sign out (Demo) */}
      <div className="pt-1">
        <Button
          variant="outline"
          size="lg"
          fullWidth
          leftIcon={<LogOutIcon size={18} />}
          className="text-danger hover:bg-danger-background hover:border-danger/30"
          onClick={() => void logout()}
        >
          Đăng xuất
        </Button>
      </div>

      {/* Confirmation Dialog for Rotating Link */}
      <Dialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title="Tạo liên kết lịch mới?"
        description="Liên kết cũ sẽ ngừng hoạt động ngay lập tức. Bạn sẽ cần dán lại liên kết mới vào Google Calendar."
        footer={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => setResetDialogOpen(false)}
            >
              Giữ nguyên
            </Button>
            <Button variant="danger" size="md" onClick={handleConfirmRotate}>
              Tạo liên kết mới
            </Button>
          </>
        }
      />

      {/* Demo Connect Dialog for Outlook / Phoenix */}
      <Dialog
        open={Boolean(demoDialogSource)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDemoDialogSource(null);
        }}
        title={
          demoDialogSource
            ? `Kết nối ${demoDialogSource.name} (Bản demo)`
            : "Bản demo"
        }
        description={
          demoDialogSource
            ? `Đây là bản giao diện thử nghiệm. Tính năng xác thực và đồng bộ tài khoản ${demoDialogSource.name} thật sẽ được tích hợp ở giai đoạn tiếp theo.`
            : undefined
        }
        footer={
          <Button
            variant="primary"
            size="md"
            onClick={() => setDemoDialogSource(null)}
          >
            Đã hiểu
          </Button>
        }
      />

      {/* .ics URL Sheet */}
      <Sheet
        open={icsSheetOpen}
        placement="drawer"
        size="sm"
        onOpenChange={setIcsSheetOpen}
        title="Kết nối lịch Phoenix"
        subtitle="Kết nối bằng link .ics của Phoenix để thấy workshop, mentor duty và hạn nộp"
        footer={
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleIcsSubmit}
          >
            Kết nối
          </Button>
        }
      >
        <div className="p-3.5 rounded-[16px] bg-background border border-border flex flex-col gap-2.5">
          <h3 className="text-[14px] leading-[20px] font-semibold text-text-primary">Lấy link trên Phoenix</h3>
          <ol className="flex flex-col gap-2">
            {PHOENIX_STEPS.map((step, index) => (
              <li key={step} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sage-background text-on-sage text-[11px] font-semibold inline-flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                  {index + 1}
                </span>
                <span className="text-[13px] leading-[19px] text-text-primary">{step}</span>
              </li>
            ))}
          </ol>
          <a
            href={PHOENIX_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 self-start min-h-9 px-4 rounded-full border border-border bg-surface text-[13px] font-medium text-text-primary hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Mở Phoenix
          </a>
          <p className="text-[12px] leading-[17px] text-text-secondary">
            Ai có link này đều xem được lịch Phoenix của bạn. Nếu lỡ để lộ, bấm “Tạo link mới” trên Phoenix rồi dán lại link mới ở đây.
          </p>
        </div>
        <Input
          label="Link lịch Phoenix (.ics)"
          type="url"
          value={icsUrl}
          onChange={(e) => setIcsUrl(e.target.value)}
          placeholder="https://phoenix.note.transformerlabs.ai/api/events/feed/….ics"
          error={
            icsInvalid
              ? "Dán đúng link lịch Phoenix: https://…/api/events/feed/….ics"
              : undefined
          }
          helperText="Link riêng tư của bạn. App không hiển thị lại link này."
        />
      </Sheet>
    </div>
  );
}
