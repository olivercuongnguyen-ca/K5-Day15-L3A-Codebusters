"use client";

import { useState } from "react";
import Link from "next/link";
import {
  COLOR_TOKENS,
  MOTION_TOKENS,
  RADIUS_TOKENS,
  SHADOW_TOKENS,
  SPACING_TOKENS,
  TYPOGRAPHY_TOKENS,
} from "@/lib/tokens";
import {
  AlertCircleIcon,
  Badge,
  BellIcon,
  Button,
  CalendarIcon,
  ClockIcon,
  CopyIcon,
  DateStrip,
  type DateStripItem,
  Dialog,
  EventCard,
  EventCardSkeleton,
  ExternalLinkIcon,
  IconButton,
  InfoIcon,
  Input,
  LinkIcon,
  LockIcon,
  MailIcon,
  RefreshIcon,
  SchoolIcon,
  SearchIcon,
  Sheet,
  Skeleton,
  SourceCardSkeleton,
  Tabs,
  Toast,
  type ToastTone,
  UserIcon,
  VideoIcon,
} from "@/components/ui";

const MOCK_WEEK: DateStripItem[] = [
  { key: "23", weekdayLabel: "T2", dayNumber: 23, hasEvents: true, fullDateLabel: "Thứ Hai, 23 tháng 11" },
  { key: "24", weekdayLabel: "T3", dayNumber: 24, hasEvents: true, fullDateLabel: "Thứ Ba, 24 tháng 11" },
  { key: "25", weekdayLabel: "T4", dayNumber: 25, hasEvents: false, fullDateLabel: "Thứ Tư, 25 tháng 11" },
  { key: "26", weekdayLabel: "T5", dayNumber: 26, hasEvents: true, fullDateLabel: "Thứ Năm, 26 tháng 11" },
  { key: "27", weekdayLabel: "T6", dayNumber: 27, isToday: true, hasEvents: true, fullDateLabel: "Thứ Sáu, 27 tháng 11, hôm nay" },
  { key: "28", weekdayLabel: "T7", dayNumber: 28, hasEvents: true, fullDateLabel: "Thứ Bảy, 28 tháng 11" },
  { key: "29", weekdayLabel: "CN", dayNumber: 29, hasEvents: false, fullDateLabel: "Chủ Nhật, 29 tháng 11" },
];

const MOCK_DAY_EVENT_COUNTS: Record<string, string> = {
  "23": "Thứ Hai, 23/11 · 2 sự kiện",
  "24": "Thứ Ba, 24/11 · 3 sự kiện",
  "25": "Thứ Tư, 25/11 · Chưa có buổi học nào",
  "26": "Thứ Năm, 26/11 · 2 sự kiện",
  "27": "Hôm nay, 27/11 · 4 sự kiện",
  "28": "Thứ Bảy, 28/11 · 2 sự kiện",
  "29": "Chủ Nhật, 29/11 · Nghỉ cuối tuần",
};

interface MockEventDetail {
  id: string;
  categoryLabel: string;
  categoryVariant: "secondary" | "primary" | "info" | "warning";
  title: string;
  timeRange: string;
  format: string;
  mentor: string;
  sourceLabel: string;
  changeNote?: string;
  ctaLabel: string;
}

const MOCK_DETAILS: Record<string, MockEventDetail> = {
  coaching: {
    id: "coaching",
    categoryLabel: "Workshop",
    categoryVariant: "primary",
    title: "Workshop: Thiết kế AI Agent",
    timeRange: "Thứ Sáu, 27/11 · 20:00 – 21:30",
    format: "Trực tuyến qua Zoom · Mở phòng trước 10 phút",
    mentor: "Trần Minh Quân · Mentor chuyên môn",
    sourceLabel: "Outlook + Phoenix · Cập nhật 10 phút trước",
    changeNote: "Đã đổi từ 19:30 – 21:00 sang 20:00 – 21:30",
    ctaLabel: "Vào lớp",
  },
  workshop: {
    id: "workshop",
    categoryLabel: "Buổi học",
    categoryVariant: "secondary",
    title: "Workshop: Đánh giá chất lượng RAG",
    timeRange: "Thứ Sáu, 27/11 · 18:30 – 20:00",
    format: "Trực tuyến · Kèm phòng thảo luận nhóm",
    mentor: "Lê Hoàng Nam · Giảng viên",
    sourceLabel: "Phoenix · Cập nhật 15 phút trước",
    ctaLabel: "Vào lớp",
  },
  deadline: {
    id: "deadline",
    categoryLabel: "Hạn nộp",
    categoryVariant: "warning",
    title: "Hạn nộp Lab: Data Ingestion",
    timeRange: "Thứ Sáu, 27/11 · Trước 23:59 (GMT+7)",
    format: "Nộp bài trực tuyến trên cổng học tập",
    mentor: "Bài thực hành cá nhân · Tuần 4",
    sourceLabel: "Outlook · Cập nhật lúc 08:30",
    ctaLabel: "Mở trang nộp bài",
  },
};

export function DesignSystemShowcase() {
  const [selectedDay, setSelectedDay] = useState("27");
  const [calendarTab, setCalendarTab] = useState("week");
  const [searchText, setSearchText] = useState("Coaching AI Agent");
  const [icsInput, setIcsInput] = useState("https://sai-dinh-dang");
  const [bellPressed, setBellPressed] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetEventKey, setSheetEventKey] = useState<string | null>(null);
  const [toastState, setToastState] = useState<{
    open: boolean;
    message: string;
    tone: ToastTone;
  }>({
    open: false,
    message: "",
    tone: "success",
  });

  const activeSheetEvent = sheetEventKey ? MOCK_DETAILS[sheetEventKey] : null;
  const isIcsError =
    icsInput.trim().length > 0 && !icsInput.trim().endsWith(".ics");

  function showToast(message: string, tone: ToastTone = "success") {
    setToastState({ open: true, message, tone });
  }

  function handleSimulateSync() {
    setButtonLoading(true);
    window.setTimeout(() => {
      setButtonLoading(false);
      showToast("Đã cập nhật dữ liệu mẫu từ Outlook và Phoenix", "success");
    }, 900);
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 md:py-12 flex flex-col gap-10">
        {/* Header */}
        <header className="bg-surface border border-border rounded-[24px] p-6 md:p-8 shadow-card flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-on-primary">
                <CalendarIcon size={18} />
              </span>
              <span className="text-[13px] leading-[18px] font-medium text-secondary">
                ViUnify · Hệ thống thiết kế v1.1
              </span>
              <Badge variant="secondary">Dữ liệu giả lập</Badge>
            </div>
            <h1 className="text-[28px] leading-[36px] font-semibold tracking-[-0.3px] text-text-primary text-balance">
              Thư viện nền tảng & thành phần giao diện
            </h1>
            <p className="text-[15px] leading-[22px] text-text-secondary max-w-prose text-pretty">
              Bảng màu Ivory–Pink–Lilac sáng tinh gọn cùng badge ngữ nghĩa và
              bottom-bar viên thuốc nổi cho ứng dụng tổng hợp lịch học từ
              Outlook, Phoenix và liên kết .ics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" size="md">
              Be Vietnam Pro
            </Badge>
            <Badge variant="outline" size="md">
              Hệ khoảng cách 4px
            </Badge>
            <Link
              href="/"
              className="inline-flex items-center justify-center min-h-11 px-4 rounded-full bg-surface-subtle border border-border text-[13px] font-medium text-text-primary hover:bg-primary-container transition-colors duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Về trang chủ
            </Link>
          </div>
        </header>

        {/* 1. Bảng màu */}
        <section aria-labelledby="section-colors" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2
              id="section-colors"
              className="text-[22px] leading-[30px] font-semibold tracking-[-0.2px] text-text-primary"
            >
              Bảng màu ngữ nghĩa
            </h2>
            <p className="text-[15px] leading-[22px] text-text-secondary">
              Nền ngà #FFF9F4, bề mặt #FFFEFC, mực đậm #171719 và tím tử đinh hương
              #5C4375 giữ độ tương phản cao, dịu mắt khi xem lịch mỗi ngày.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {COLOR_TOKENS.map((token) => (
              <div
                key={token.cssVar}
                className="bg-surface border border-border rounded-[20px] p-3 shadow-card-sm flex flex-col gap-2.5"
              >
                <div
                  className="h-14 rounded-[12px] border border-border/80"
                  style={{ backgroundColor: token.hex }}
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] leading-[18px] font-medium text-text-primary">
                    {token.name}
                  </span>
                  <span className="text-[12px] leading-[16px] text-text-secondary tabular-nums">
                    {token.hex}
                  </span>
                  <span className="text-[11px] leading-[15px] text-text-secondary">
                    {token.contrastNote ?? token.usage}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Typography & Spacing / Radius / Shadow */}
        <section
          aria-labelledby="section-typography"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="bg-surface border border-border rounded-[24px] p-6 shadow-card flex flex-col gap-4">
            <h2
              id="section-typography"
              className="text-[22px] leading-[30px] font-semibold tracking-[-0.2px] text-text-primary"
            >
              Typography (Be Vietnam Pro)
            </h2>
            <div className="flex flex-col divide-y divide-border">
              {TYPOGRAPHY_TOKENS.map((item) => (
                <div
                  key={item.token}
                  className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1.5"
                >
                  <p
                    className={item.tabular ? "tabular-nums" : undefined}
                    style={{
                      fontSize: item.size,
                      lineHeight: item.lineHeight,
                      fontWeight: Number(item.weight),
                    }}
                  >
                    {item.sample}
                  </p>
                  <span className="text-[12px] leading-[16px] text-text-secondary tabular-nums shrink-0">
                    {item.token} · {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-border rounded-[24px] p-6 shadow-card flex flex-col gap-5">
            <h2 className="text-[22px] leading-[30px] font-semibold tracking-[-0.2px] text-text-primary">
              Khoảng cách, Bo góc & Bóng nhẹ
            </h2>

            <div className="flex flex-col gap-2">
              {SPACING_TOKENS.map((sp) => (
                <div key={sp.name} className="flex items-center gap-3">
                  <span className="w-24 text-[12px] leading-[16px] font-medium text-text-secondary">
                    {sp.name}
                  </span>
                  <span className="w-10 text-[12px] leading-[16px] text-text-primary tabular-nums">
                    {sp.px}px
                  </span>
                  <div
                    className="h-2.5 rounded-full bg-olive"
                    style={{ width: `${sp.px * 3}px` }}
                  />
                  {sp.note ? (
                    <span className="text-[12px] text-text-secondary">
                      {sp.note}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-border">
              {RADIUS_TOKENS.map((r) => (
                <div
                  key={r.name}
                  className="bg-background border border-border p-3 text-center flex flex-col gap-0.5"
                  style={{ borderRadius: r.value }}
                >
                  <span className="text-[13px] font-medium text-text-primary">
                    {r.value}
                  </span>
                  <span className="text-[11px] text-text-secondary">
                    {r.target}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-border">
              {SHADOW_TOKENS.map((sh) => (
                <div
                  key={sh.name}
                  className="bg-surface border border-border rounded-[16px] p-3 flex flex-col gap-0.5"
                  style={{ boxShadow: sh.value }}
                >
                  <span className="text-[13px] font-medium text-text-primary">
                    {sh.name}
                  </span>
                  <span className="text-[11px] text-text-secondary">
                    {sh.usage}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              {MOTION_TOKENS.map((m) => (
                <Badge key={m.name} variant="outline" size="sm">
                  {m.name}: {m.duration} ({m.easing})
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Button, IconButton, Badge */}
        <section
          aria-labelledby="section-buttons"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="bg-surface border border-border rounded-[24px] p-6 shadow-card flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2
                id="section-buttons"
                className="text-[18px] leading-[26px] font-semibold text-text-primary"
              >
                Button & IconButton
              </h2>
              <p className="text-[13px] leading-[20px] text-text-secondary">
                Nút viên thuốc vùng chạm tối thiểu 44px, có vòng focus rõ khi
                di chuyển bằng phím Tab.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="primary"
                leftIcon={<VideoIcon size={18} />}
                onClick={() => showToast("Đang mở liên kết buổi học mẫu", "info")}
              >
                Vào lớp
              </Button>
              <Button variant="secondary">Hôm nay</Button>
              <Button
                variant="outline"
                leftIcon={<ExternalLinkIcon size={17} />}
              >
                Xem nguồn gốc
              </Button>
              <Button variant="ghost">Tạo liên kết mới</Button>
              <Button
                variant="danger"
                onClick={() => setDialogOpen(true)}
              >
                Tạo lại .ics
              </Button>
              <Button
                variant="primary"
                loading={buttonLoading}
                onClick={handleSimulateSync}
              >
                {buttonLoading ? "Đang đồng bộ..." : "Thử đồng bộ"}
              </Button>
              <Button variant="primary" disabled>
                Vô hiệu
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
              <span className="text-[13px] font-medium text-text-secondary">
                IconButton:
              </span>
              <IconButton
                aria-label="Thông báo lịch học"
                hasDot
                pressed={bellPressed}
                icon={<BellIcon size={20} />}
                onClick={() => {
                  setBellPressed((prev) => !prev);
                  showToast(
                    !bellPressed
                      ? "Đã bật xem trước thông báo"
                      : "Đã tắt xem trước thông báo",
                    "info",
                  );
                }}
              />
              <IconButton
                aria-label="Cập nhật tất cả nguồn"
                variant="subtle"
                icon={<RefreshIcon size={20} />}
                onClick={handleSimulateSync}
              />
              <IconButton
                aria-label="Sao chép nhanh"
                variant="primary"
                icon={<CopyIcon size={18} />}
                onClick={() => showToast("Đã sao chép liên kết lịch", "success")}
              />
              <IconButton
                aria-label="Nút biểu tượng bị vô hiệu"
                disabled
                icon={<LockIcon size={18} />}
              />
            </div>
          </div>

          <div className="bg-surface border border-border rounded-[24px] p-6 shadow-card flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-[18px] leading-[26px] font-semibold text-text-primary">
                Badge & Trạng thái nguồn
              </h2>
              <p className="text-[13px] leading-[20px] text-text-secondary">
                Dùng sentence case, giữ nhãn ngắn trên một dòng, kết hợp chấm
                hoặc icon vector khi cần phân biệt trạng thái.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Buổi học</Badge>
              <Badge variant="primary">Workshop</Badge>
              <Badge variant="info">Hỗ trợ / Lab</Badge>
              <Badge variant="warning" icon={<ClockIcon size={13} />}>
                Hạn nộp
              </Badge>
              <Badge variant="warning">Đổi từ 19:30</Badge>
              <Badge variant="neutral">Trung tính</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
              <Badge variant="success" dot size="md">
                Đã kết nối
              </Badge>
              <Badge variant="warning" dot size="md">
                Cần kết nối lại
              </Badge>
              <Badge
                variant="info"
                size="md"
                icon={<RefreshIcon size={14} className="animate-spin motion-reduce:animate-none" />}
              >
                Đang cập nhật
              </Badge>
              <Badge
                variant="danger"
                dot
                size="md"
                icon={<AlertCircleIcon size={14} />}
              >
                Cập nhật thất bại
              </Badge>
              <Badge variant="outline" size="md" icon={<MailIcon size={14} />}>
                Outlook
              </Badge>
              <Badge variant="outline" size="md" icon={<SchoolIcon size={14} />}>
                Phoenix
              </Badge>
              <Badge variant="outline" size="md" icon={<LinkIcon size={14} />}>
                Nguồn .ics
              </Badge>
            </div>
          </div>
        </section>

        {/* 4. Input */}
        <section
          aria-labelledby="section-inputs"
          className="bg-surface border border-border rounded-[24px] p-6 shadow-card flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1">
            <h2
              id="section-inputs"
              className="text-[18px] leading-[26px] font-semibold text-text-primary"
            >
              Input (Tìm kiếm, URL chỉ đọc & Báo lỗi)
            </h2>
            <p className="text-[13px] leading-[20px] text-text-secondary">
              Mỗi ô nhập liệu có nhãn gắn kết rõ ràng, vùng chạm cao 48px và
              thông báo lỗi gắn qua aria-describedby.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Tìm kiếm sự kiện"
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Tên buổi học, mentor..."
              leftIcon={<SearchIcon size={18} />}
              helperText="Gõ từ khóa để lọc nhanh lịch học trong tuần."
            />

            <Input
              label="Liên kết đăng ký lịch (.ics)"
              type="text"
              readOnly
              tabularNums
              value="https://unify.edu.vn/ics/••••••••9a4f.ics"
              helperText="Token riêng tư được che bớt để bảo mật."
              rightSlot={
                <Button
                  size="md"
                  leftIcon={<CopyIcon size={16} />}
                  onClick={() =>
                    showToast("Đã sao chép liên kết lịch", "success")
                  }
                >
                  Sao chép
                </Button>
              }
            />

            <Input
              label="Thêm nguồn .ics ngoài"
              type="url"
              value={icsInput}
              onChange={(e) => setIcsInput(e.target.value)}
              placeholder="https://example.edu.vn/calendar.ics"
              error={
                isIcsError
                  ? "Liên kết chưa kết thúc bằng .ics (thử thêm .ics để hết lỗi)"
                  : undefined
              }
              helperText={
                !isIcsError
                  ? "Định dạng liên kết hợp lệ (chưa kết nối thật)."
                  : undefined
              }
            />
          </div>
        </section>

        {/* 5. DateStrip & Tabs */}
        <section
          aria-labelledby="section-nav-controls"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="bg-surface border border-border rounded-[24px] p-6 shadow-card flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <h2
                  id="section-nav-controls"
                  className="text-[18px] leading-[26px] font-semibold text-text-primary"
                >
                  DateStrip (Thanh chọn ngày)
                </h2>
                <p className="text-[13px] leading-[20px] text-text-secondary">
                  Phân biệt Hôm nay (viền mực đậm) và ngày Đang chọn (nền tím nhạt
                  + viền tử đinh hương). Hỗ trợ phím mũi tên Trái/Phải.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedDay("27")}
              >
                Về hôm nay
              </Button>
            </div>

            <DateStrip
              items={MOCK_WEEK}
              selectedKey={selectedDay}
              onSelect={setSelectedDay}
            />

            <div className="flex items-center justify-between pt-2 border-t border-border text-[13px] text-text-secondary">
              <span className="font-medium text-text-primary">
                {MOCK_DAY_EVENT_COUNTS[selectedDay]}
              </span>
              <span className="tabular-nums">Tháng 11, 2026</span>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-[24px] p-6 shadow-card flex flex-col gap-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[18px] leading-[26px] font-semibold text-text-primary">
                Tabs (Segmented control)
              </h2>
              <p className="text-[13px] leading-[20px] text-text-secondary">
                Hỗ trợ phím mũi tên Trái/Phải, Home/End và gán thuộc tính ARIA
                tablist/tabpanel đầy đủ.
              </p>
            </div>

            <Tabs
              ariaLabel="Chế độ xem lịch"
              value={calendarTab}
              onValueChange={setCalendarTab}
              items={[
                {
                  value: "week",
                  label: "Tuần",
                  content: (
                    <div className="p-4 rounded-[16px] bg-background border border-border flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[14px] font-medium text-text-primary">
                          Chế độ xem theo tuần
                        </span>
                        <span className="text-[13px] text-text-secondary tabular-nums">
                          23/11 – 29/11 · 9 sự kiện đã hợp nhất
                        </span>
                      </div>
                      <Badge variant="sage">Đang bật</Badge>
                    </div>
                  ),
                },
                {
                  value: "month",
                  label: "Tháng",
                  content: (
                    <div className="p-4 rounded-[16px] bg-background border border-border flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[14px] font-medium text-text-primary">
                          Chế độ xem theo tháng
                        </span>
                        <span className="text-[13px] text-text-secondary tabular-nums">
                          Tháng 11, 2026 · Có 3 hạn nộp sắp tới
                        </span>
                      </div>
                      <Badge variant="primary">Tổng quan</Badge>
                    </div>
                  ),
                },
                {
                  value: "sources",
                  label: "Theo nguồn",
                  content: (
                    <div className="p-4 rounded-[16px] bg-background border border-border flex flex-wrap items-center gap-2">
                      <Badge variant="sage" dot>
                        Outlook (14)
                      </Badge>
                      <Badge variant="primary" dot>
                        Phoenix (8)
                      </Badge>
                      <Badge variant="neutral">Lịch .ics (2)</Badge>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </section>

        {/* 6. EventCard */}
        <section aria-labelledby="section-event-cards" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2
              id="section-event-cards"
              className="text-[22px] leading-[30px] font-semibold tracking-[-0.2px] text-text-primary"
            >
              EventCard (Thẻ sự kiện & dòng thời gian)
            </h2>
            <p className="text-[15px] leading-[22px] text-text-secondary">
              Nhấn vào từng thẻ bên dưới để mở Sheet chi tiết sự kiện mẫu.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 flex flex-col gap-3">
              <span className="text-[13px] font-medium text-text-secondary">
                Biến thể Featured (Buổi học tiếp theo)
              </span>
              <EventCard
                variant="featured"
                category="coaching"
                title="Coaching: Thiết kế AI Agent"
                timeRange="20:00 – 21:30"
                formatLabel="Trực tuyến"
                sources={["Outlook", "Phoenix"]}
                changeNote="Đổi từ 19:30"
                ctaLabel="Vào lớp"
                onCtaClick={() => setSheetEventKey("coaching")}
              />
            </div>

            <div className="lg:col-span-7 flex flex-col gap-3">
              <span className="text-[13px] font-medium text-text-secondary">
                Biến thể Timeline & Trạng thái đổi giờ
              </span>
              <div className="flex flex-col gap-3">
                <EventCard
                  variant="timeline"
                  showTimelineRail
                  category="session"
                  title="Workshop: Đánh giá chất lượng RAG"
                  startTime="18:30"
                  timeRange="18:30 – 20:00"
                  formatLabel="Trực tuyến"
                  sources={["Phoenix"]}
                  onSelect={() => setSheetEventKey("workshop")}
                />
                <EventCard
                  variant="timeline"
                  showTimelineRail
                  category="coaching"
                  title="Workshop: Thiết kế AI Agent"
                  startTime="20:00"
                  timeRange="20:00 – 21:30"
                  formatLabel="Trực tuyến"
                  sources={["Outlook", "Phoenix"]}
                  changeNote="Đổi từ 19:30"
                  onSelect={() => setSheetEventKey("coaching")}
                />
                <EventCard
                  variant="timeline"
                  showTimelineRail
                  isLastInTimeline
                  category="deadline"
                  title="Hạn nộp Lab: Data Ingestion"
                  startTime="23:59"
                  timeRange="Trước 23:59 hôm nay"
                  sources={["Outlook"]}
                  onSelect={() => setSheetEventKey("deadline")}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 7. Dialog, Sheet, Toast & Skeleton */}
        <section
          aria-labelledby="section-overlays"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="bg-surface border border-border rounded-[24px] p-6 shadow-card flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2
                id="section-overlays"
                className="text-[18px] leading-[26px] font-semibold text-text-primary"
              >
                Dialog, Sheet & Toast
              </h2>
              <p className="text-[13px] leading-[20px] text-text-secondary">
                Hỗ trợ đóng bằng Escape, chạm nền mờ, khóa cuộn trang và tự khôi
                phục focus về nút kích hoạt.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                onClick={() => setSheetEventKey("coaching")}
              >
                Mở Sheet chi tiết
              </Button>
              <Button variant="danger" onClick={() => setDialogOpen(true)}>
                Mở Dialog xác nhận
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  showToast("Đã sao chép liên kết lịch", "success")
                }
              >
                Hiện Toast thành công
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  showToast("Không thể kết nối Phoenix, hãy thử lại", "danger")
                }
              >
                Hiện Toast lỗi
              </Button>
            </div>

            <div className="flex flex-col gap-2.5 pt-3 border-t border-border">
              <span className="text-[13px] font-medium text-text-secondary">
                Mẫu Toast (xem tĩnh):
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Toast
                  inline
                  tone="success"
                  message="Đã sao chép liên kết lịch"
                />
                <Toast
                  inline
                  tone="warning"
                  message="Buổi coaching đã chuyển sang 20:00"
                />
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-[24px] p-6 shadow-card flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-[18px] leading-[26px] font-semibold text-text-primary">
                Skeleton (Trạng thái đang tải)
              </h2>
              <p className="text-[13px] leading-[20px] text-text-secondary">
                Nhịp nhấp nháy nhẹ theo màu viền ấm, tự tắt khi bật chế độ giảm
                chuyển động.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Skeleton className="w-11 h-11 shrink-0" />
              <div className="flex flex-col gap-2 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            </div>

            <EventCardSkeleton />
            <SourceCardSkeleton />
          </div>
        </section>
      </div>

      {/* Dialog xác nhận */}
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Tạo liên kết lịch mới?"
        description="Liên kết cũ sẽ ngừng hoạt động ngay lập tức. Bạn sẽ cần dán lại liên kết mới vào Google Calendar."
        footer={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => setDialogOpen(false)}
            >
              Giữ nguyên
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setDialogOpen(false);
                showToast("Đã tạo liên kết lịch mới (dữ liệu mẫu)", "success");
              }}
            >
              Tạo liên kết mới
            </Button>
          </>
        }
      />

      {/* Sheet chi tiết sự kiện */}
      <Sheet
        open={Boolean(activeSheetEvent)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSheetEventKey(null);
        }}
        title={activeSheetEvent?.title ?? ""}
        headerBadge={
          activeSheetEvent ? (
            <>
              <Badge variant={activeSheetEvent.categoryVariant}>
                {activeSheetEvent.categoryLabel}
              </Badge>
              <Badge variant="secondary">Trực tuyến</Badge>
            </>
          ) : null
        }
        footer={
          activeSheetEvent ? (
            <>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                leftIcon={
                  activeSheetEvent.id === "deadline" ? (
                    <ExternalLinkIcon size={18} />
                  ) : (
                    <VideoIcon size={18} />
                  )
                }
                onClick={() => {
                  const label = activeSheetEvent.ctaLabel;
                  setSheetEventKey(null);
                  showToast(`Thao tác mẫu: ${label}`, "info");
                }}
              >
                {activeSheetEvent.ctaLabel}
              </Button>
              <Button
                variant="outline"
                size="lg"
                fullWidth
                onClick={() => setSheetEventKey(null)}
              >
                Đóng
              </Button>
            </>
          ) : null
        }
      >
        {activeSheetEvent?.changeNote ? (
          <div className="flex items-start gap-2.5 p-3.5 rounded-[16px] bg-warning-background text-on-warning">
            <ClockIcon size={18} className="shrink-0 mt-0.5" />
            <span className="text-[14px] leading-[20px] tabular-nums">
              {activeSheetEvent.changeNote}
            </span>
          </div>
        ) : null}

        {activeSheetEvent ? (
          <div className="flex flex-col gap-3 text-[15px] leading-[22px]">
            <div className="flex items-start gap-3">
              <CalendarIcon size={18} className="text-primary shrink-0 mt-0.5" />
              <span className="tabular-nums">{activeSheetEvent.timeRange}</span>
            </div>
            <div className="flex items-start gap-3">
              <VideoIcon size={18} className="text-primary shrink-0 mt-0.5" />
              <span>{activeSheetEvent.format}</span>
            </div>
            <div className="flex items-start gap-3">
              <UserIcon size={18} className="text-primary shrink-0 mt-0.5" />
              <span>{activeSheetEvent.mentor}</span>
            </div>
            <div className="flex items-start gap-3 p-3.5 rounded-[16px] bg-background border border-border">
              <InfoIcon size={18} className="text-text-secondary shrink-0 mt-0.5" />
              <span className="text-[13px] leading-[20px] text-text-secondary">
                Nguồn: {activeSheetEvent.sourceLabel}
              </span>
            </div>
          </div>
        ) : null}
      </Sheet>

      {/* Live Toast */}
      <Toast
        open={toastState.open}
        message={toastState.message}
        tone={toastState.tone}
        onClose={() => setToastState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
