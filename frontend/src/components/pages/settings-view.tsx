"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MOCK_SOURCES, type CalendarSource } from "@/data/mock-schedule";
import { cn } from "@/lib/cn";
import {
  AlertCircleIcon,
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
import { useApp } from "@/components/app/app-provider";

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
  const router = useRouter();
  const {
    currentUser,
    showToast,
    preferences,
    updatePreference,
    maskedIcsUrl,
    rotateMockIcsUrl,
  } = useApp();

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [icsSheetOpen, setIcsSheetOpen] = useState(false);
  const [demoDialogSource, setDemoDialogSource] =
    useState<CalendarSource | null>(null);
  const [icsUrl, setIcsUrl] = useState("");
  const [icsTouched, setIcsTouched] = useState(false);
  const [showSkeletonPreview, setShowSkeletonPreview] = useState(false);

  const trimmedIcs = icsUrl.trim();
  const icsInvalid =
    icsTouched &&
    (trimmedIcs.length === 0 ||
      (!trimmedIcs.startsWith("https://") &&
        !trimmedIcs.startsWith("http://")) ||
      !trimmedIcs.toLowerCase().includes(".ics"));

  async function handleCopyIcsLink() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(maskedIcsUrl);
      }
    } catch {
      // Fallback safely in restricted contexts while keeping UX honest
    }
    showToast("Đã sao chép liên kết lịch (bản mẫu)", "success");
  }

  function handleConfirmRotate() {
    rotateMockIcsUrl();
    setResetDialogOpen(false);
    showToast("Đã tạo liên kết lịch mẫu mới", "success");
  }

  function handleSourceAction(source: CalendarSource) {
    if (source.id === "ics") {
      setIcsUrl("");
      setIcsTouched(false);
      setIcsSheetOpen(true);
      return;
    }
    setDemoDialogSource(source);
  }

  function handleIcsSubmit() {
    setIcsTouched(true);
    if (
      trimmedIcs.length === 0 ||
      (!trimmedIcs.startsWith("https://") &&
        !trimmedIcs.startsWith("http://")) ||
      !trimmedIcs.toLowerCase().includes(".ics")
    ) {
      return;
    }
    setIcsSheetOpen(false);
    showToast(
      "Đây là bản demo — chưa hỗ trợ lưu hay đồng bộ liên kết .ics thật.",
      "info",
    );
  }

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
          onClick={() => router.push("/login")}
        >
          Đổi tài khoản
        </Button>
      </section>

      {/* Display Preferences */}
      <section
        aria-label="Tùy chọn hiển thị lịch"
        className="flex flex-col gap-2 md:gap-2.5"
      >
        <h2 className="text-[12px] md:text-[13px] leading-[18px] font-medium text-text-secondary px-1">
          Tùy chọn hiển thị lịch
        </h2>

        <div className="bg-surface border border-border rounded-[20px] md:rounded-[24px] divide-y divide-border overflow-hidden shadow-card-sm">
          <div className="p-3.5 sm:p-5 flex items-center justify-between gap-3 md:gap-4">
            <div className="flex flex-col gap-0.5">
              <span
                id="pref-deadline-label"
                className="text-[14px] leading-[20px] md:text-[15px] md:leading-[22px] font-medium text-text-primary"
              >
                Hiện hạn nộp trong timeline
              </span>
              <span className="text-[12px] leading-[17px] md:text-[13px] md:leading-[19px] text-text-secondary">
                Hiển thị bài tập đến hạn cùng dòng thời gian các buổi học
              </span>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={preferences.showDeadlinesInTimeline}
              aria-labelledby="pref-deadline-label"
              onClick={() => {
                const next = !preferences.showDeadlinesInTimeline;
                updatePreference("showDeadlinesInTimeline", next);
                showToast(
                  next
                    ? "Đã bật hiển thị hạn nộp trong timeline"
                    : "Đã ẩn hạn nộp khỏi timeline",
                  "info",
                );
              }}
              className={cn(
                "relative inline-flex items-center w-12 h-7 rounded-full border transition-colors duration-[180ms] shrink-0 cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                preferences.showDeadlinesInTimeline
                  ? "bg-primary border-primary"
                  : "bg-background border-border",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "w-5 h-5 rounded-full transition-transform duration-[180ms] shadow-sm",
                  preferences.showDeadlinesInTimeline
                    ? "translate-x-6 bg-on-primary"
                    : "translate-x-1 bg-text-secondary",
                )}
              />
            </button>
          </div>

          <div className="p-3.5 sm:p-5 flex items-center justify-between gap-3 md:gap-4">
            <div className="flex flex-col gap-0.5">
              <span
                id="pref-merge-label"
                className="text-[14px] leading-[20px] md:text-[15px] md:leading-[22px] font-medium text-text-primary"
              >
                Gộp sự kiện trùng nguồn
              </span>
              <span className="text-[12px] leading-[17px] md:text-[13px] md:leading-[19px] text-text-secondary">
                Chỉ hiển thị một mục khi Outlook và Phoenix trùng khung giờ
              </span>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={preferences.mergeDuplicateSources}
              aria-labelledby="pref-merge-label"
              onClick={() => {
                const next = !preferences.mergeDuplicateSources;
                updatePreference("mergeDuplicateSources", next);
                showToast(
                  next
                    ? "Đã bật gộp sự kiện trùng nguồn"
                    : "Đã tắt gộp sự kiện trùng nguồn",
                  "info",
                );
              }}
              className={cn(
                "relative inline-flex items-center w-12 h-7 rounded-full border transition-colors duration-[180ms] shrink-0 cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                preferences.mergeDuplicateSources
                  ? "bg-primary border-primary"
                  : "bg-background border-border",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "w-5 h-5 rounded-full transition-transform duration-[180ms] shadow-sm",
                  preferences.mergeDuplicateSources
                    ? "translate-x-6 bg-on-primary"
                    : "translate-x-1 bg-text-secondary",
                )}
              />
            </button>
          </div>
        </div>
      </section>

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
              Tổng hợp từ Outlook, Phoenix và liên kết .ics (dữ liệu demo)
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshIcon size={15} />}
            onClick={() =>
              showToast(
                "Đây là bản demo — các nút đồng bộ chưa kết nối tài khoản thật.",
                "info",
              )
            }
          >
            Đồng bộ tất cả
          </Button>
        </div>

        <div className="flex items-start gap-2.5 p-3 md:p-3.5 rounded-[14px] md:rounded-[16px] bg-surface-subtle border border-border text-text-primary">
          <InfoIcon size={16} className="text-primary shrink-0 mt-0.5 md:w-[18px] md:h-[18px]" />
          <span className="text-[12px] leading-[18px] md:text-[13px] md:leading-[19px] text-text-secondary text-pretty">
            Chế độ xem thử (Demo): thao tác kết nối hoặc thử lại chỉ mô phỏng
            giao diện, không giả lập kết nối tài khoản thật.
          </span>
        </div>

        {showSkeletonPreview ? (
          <div className="flex flex-col gap-2.5 md:gap-3" aria-busy="true">
            <SourceCardSkeleton />
            <SourceCardSkeleton />
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 md:gap-3">
            {MOCK_SOURCES.map((source) => (
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

        <div className="bg-surface border border-border rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success" dot size="sm">
              Đã kết nối
            </Badge>
            <Badge variant="warning" size="sm">
              Cần kết nối lại
            </Badge>
            <Badge
              variant="danger"
              size="sm"
              icon={<AlertCircleIcon size={13} />}
            >
              Cập nhật thất bại
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSkeletonPreview((prev) => !prev)}
          >
            {showSkeletonPreview ? "Hiện nguồn lịch" : "Xem trạng thái tải"}
          </Button>
        </div>
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
              Đăng ký liên kết lịch cá nhân (giả lập) để theo dõi lịch học và
              hạn nộp trên Google Calendar.
            </p>
          </div>
        </div>

        <Input
          label="Liên kết đăng ký lịch (.ics mẫu)"
          type="text"
          readOnly
          tabularNums
          value={maskedIcsUrl}
          helperText="Đây là liên kết mẫu dùng để kiểm thử thao tác sao chép."
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
          onClick={() => setResetDialogOpen(true)}
        >
          Tạo liên kết mới
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
          onClick={() => {
            showToast(
              "Đã quay về màn hình đăng nhập mẫu (chưa có phiên xác thực thật).",
              "info",
            );
            router.push("/login");
          }}
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
        title="Thêm liên kết .ics"
        subtitle="Bản demo kiểm tra định dạng URL, chưa kết nối máy chủ thật"
        footer={
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleIcsSubmit}
          >
            Kiểm tra liên kết (Demo)
          </Button>
        }
      >
        <Input
          label="URL nguồn lịch (.ics)"
          type="url"
          value={icsUrl}
          onChange={(e) => setIcsUrl(e.target.value)}
          placeholder="https://truonghoc.edu.vn/lich-hoc.ics"
          error={
            icsInvalid
              ? "Vui lòng nhập URL hợp lệ bắt đầu bằng https:// và có đuôi .ics"
              : undefined
          }
          helperText="Liên kết riêng tư sẽ được che bớt token khi hiển thị trên danh sách."
        />
      </Sheet>
    </div>
  );
}
