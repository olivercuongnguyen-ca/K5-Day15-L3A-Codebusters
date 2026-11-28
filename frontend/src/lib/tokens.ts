export interface ColorToken {
  name: string;
  cssVar: string;
  hex: string;
  usage: string;
  contrastNote?: string;
}

export interface TypographyToken {
  token: string;
  label: string;
  size: string;
  lineHeight: string;
  weight: string;
  sample: string;
  tabular?: boolean;
}

export interface SpacingToken {
  name: string;
  cssVar: string;
  px: number;
  note?: string;
}

export interface RadiusToken {
  name: string;
  value: string;
  target: string;
}

export interface ShadowToken {
  name: string;
  cssVar: string;
  value: string;
  usage: string;
}

export interface MotionToken {
  name: string;
  duration: string;
  easing: string;
  usage: string;
}

export const COLOR_TOKENS: ColorToken[] = [
  {
    name: "Nền ngà (Ivory)",
    cssVar: "--background",
    hex: "#FFF9F4",
    usage: "Nền ngà ấm chủ đạo kết hợp ánh pastel hồng–tử đinh hương",
  },
  {
    name: "Bề mặt (Warm Surface)",
    cssVar: "--surface",
    hex: "#FFFEFC",
    usage: "Thẻ sự kiện, Sheet, Dialog, thanh chọn",
  },
  {
    name: "Bề mặt phụ (Surface Low)",
    cssVar: "--surface-subtle",
    hex: "#FAF3ED",
    usage: "Thẻ thông báo nhẹ, hover nhẹ, nền phụ",
  },
  {
    name: "Mực đậm (Editorial Ink)",
    cssVar: "--primary",
    hex: "#171719",
    usage: "CTA chính, tiêu đề nổi bật, badge Workshop",
    contrastNote: "17.8:1 với chữ trắng",
  },
  {
    name: "Mực nhấn (Primary pressed)",
    cssVar: "--primary-pressed",
    hex: "#26252B",
    usage: "Trạng thái hover và nhấn của nút chính",
    contrastNote: "15.0:1 với chữ trắng",
  },
  {
    name: "Tím tử đinh hương (Secondary)",
    cssVar: "--secondary",
    hex: "#5C4375",
    usage: "Điểm nhấn điều hướng, viền ngày chọn, focus ring",
    contrastNote: "8.8:1 với chữ trắng",
  },
  {
    name: "Nền tím nhạt (Lilac container)",
    cssVar: "--sage-background",
    hex: "#E8DCFF",
    usage: "Ngày đang chọn, tab bật, badge Buổi học",
    contrastNote: "12.8:1 với #1F172B",
  },
  {
    name: "Hồng phấn (Blush)",
    cssVar: "--blush",
    hex: "#F5D5E8",
    usage: "Điểm sáng icon đang chọn và nền trang trí nhẹ",
  },
  {
    name: "Chữ chính (Text primary)",
    cssVar: "--text-primary",
    hex: "#171719",
    usage: "Tiêu đề, nội dung chính, giờ học",
    contrastNote: "17.6:1 trên #FFFEFC",
  },
  {
    name: "Chữ phụ (Text secondary)",
    cssVar: "--text-secondary",
    hex: "#6F6870",
    usage: "Phụ đề, nhãn thời gian, ghi chú nhẹ",
    contrastNote: "5.2:1 trên #FFF9F4",
  },
  {
    name: "Đường viền (Border)",
    cssVar: "--border",
    hex: "#E3DAE0",
    usage: "Viền thẻ mảnh 1px, vạch timeline, divider",
  },
  {
    name: "Nền cảnh báo (Warning)",
    cssVar: "--warning-background",
    hex: "#FFEDD5",
    usage: "Banner đổi lịch, cần kết nối lại",
    contrastNote: "8.7:1 với #7C2D12",
  },
  {
    name: "Đỏ lỗi (Danger)",
    cssVar: "--danger",
    hex: "#BA1A1A",
    usage: "Hành động hủy/tạo liên kết mới, viền lỗi",
    contrastNote: "6.4:1 với chữ trắng",
  },
  {
    name: "Nền lỗi (Danger background)",
    cssVar: "--danger-background",
    hex: "#FFDAD6",
    usage: "Banner lỗi đồng bộ, nền ô nhập lỗi",
    contrastNote: "8.3:1 với #93000A",
  },
];

export const TYPOGRAPHY_TOKENS: TypographyToken[] = [
  {
    token: "display-lg",
    label: "28px / 36px · 600",
    size: "1.75rem",
    lineHeight: "2.25rem",
    weight: "600",
    sample: "Chào Quang",
  },
  {
    token: "headline-lg",
    label: "22px / 30px · 600",
    size: "1.375rem",
    lineHeight: "1.875rem",
    weight: "600",
    sample: "Buổi học tiếp theo",
  },
  {
    token: "headline-md",
    label: "18px / 26px · 600",
    size: "1.125rem",
    lineHeight: "1.625rem",
    weight: "600",
    sample: "Coaching: Thiết kế AI Agent",
  },
  {
    token: "title-md",
    label: "16px / 24px · 600",
    size: "1rem",
    lineHeight: "1.5rem",
    weight: "600",
    sample: "Workshop: Đánh giá chất lượng RAG",
  },
  {
    token: "body-md",
    label: "15px / 22px · 400",
    size: "0.9375rem",
    lineHeight: "1.375rem",
    weight: "400",
    sample: "Tổng hợp lịch học từ Outlook, Phoenix và liên kết .ics.",
  },
  {
    token: "body-sm",
    label: "13px / 20px · 400 · tabular",
    size: "0.8125rem",
    lineHeight: "1.25rem",
    weight: "400",
    sample: "20:00 – 21:30 · Trực tuyến",
    tabular: true,
  },
  {
    token: "label-md",
    label: "13px / 18px · 500",
    size: "0.8125rem",
    lineHeight: "1.125rem",
    weight: "500",
    sample: "Vào lớp · Đã kết nối · Hạn nộp",
  },
];

export const SPACING_TOKENS: SpacingToken[] = [
  { name: "xs", cssVar: "--space-xs", px: 4 },
  { name: "sm", cssVar: "--space-sm", px: 8 },
  { name: "md", cssVar: "--space-md", px: 12 },
  { name: "lg", cssVar: "--space-lg", px: 16 },
  { name: "page-margin", cssVar: "--space-page-margin", px: 20, note: "Lề ngang mobile" },
  { name: "xl", cssVar: "--space-xl", px: 24 },
  { name: "2xl", cssVar: "--space-2xl", px: 32 },
];

export const RADIUS_TOKENS: RadiusToken[] = [
  { name: "sm", value: "8px", target: "Tag nhỏ" },
  { name: "md", value: "16px", target: "Input, khung icon" },
  { name: "lg", value: "20px", target: "EventCard timeline" },
  { name: "xl", value: "24px", target: "Thẻ nổi bật, Sheet, Dialog" },
  { name: "full", value: "9999px", target: "Button, Badge, DateStrip" },
];

export const SHADOW_TOKENS: ShadowToken[] = [
  {
    name: "card-sm",
    cssVar: "--shadow-card-sm",
    value: "0 4px 12px -2px rgba(23, 23, 25, 0.05), 0 2px 6px -1px rgba(23, 23, 25, 0.03)",
    usage: "Thẻ sự kiện, thẻ nguồn lịch",
  },
  {
    name: "card",
    cssVar: "--shadow-card",
    value: "0 10px 24px -4px rgba(23, 23, 25, 0.06), 0 4px 10px -2px rgba(23, 23, 25, 0.03)",
    usage: "Thẻ nổi bật, header",
  },
  {
    name: "overlay",
    cssVar: "--shadow-overlay",
    value: "0 16px 32px -6px rgba(23, 23, 25, 0.14), 0 6px 14px -3px rgba(23, 23, 25, 0.05)",
    usage: "Dialog, Bottom Sheet",
  },
];

export const MOTION_TOKENS: MotionToken[] = [
  {
    name: "state-change",
    duration: "180ms",
    easing: "ease-out",
    usage: "Hover, nhấn nút, chọn ngày/tab",
  },
  {
    name: "surface-enter",
    duration: "240ms",
    easing: "cubic-bezier(0.2, 0, 0, 1)",
    usage: "Mở Sheet, Dialog, Toast",
  },
  {
    name: "surface-exit",
    duration: "180ms",
    easing: "cubic-bezier(0.3, 0, 1, 1)",
    usage: "Đóng bề mặt phủ",
  },
];
