import type { DateStripItem, EventCategory } from "@/components/ui";

export type SourceName = "Outlook" | "Phoenix" | ".ics" | "Nhóm";
export type CohortGroupId = "L3A" | "L3B" | "L2A" | "L2B";

export interface SimpleRoomLocation {
  rawCode: string;
  cleanCode: string;
  buildingCode: string;
  buildingLabel: string;
  floor: number;
  floorLabel: string;
  fullLabel: string;
}

export interface ScheduleEvent {
  id: string;
  dateKey: string; // YYYY-MM-DD
  dateLabel: string;
  title: string;
  category: EventCategory;
  startTime: string;
  endTime: string;
  timeRange: string;
  formatLabel: string;
  formatDetail: string;
  /** Optional: only present for Workshop, Office Hour, Mentor Duty, or Coaching */
  mentor?: string;
  description: string;
  sources: SourceName[];
  updatedAt: string;
  ctaLabel: string;
  roomCode?: string;
  allRooms?: string[];
  groupId?: CohortGroupId;
  changeNote?: string;
  previousTimeRange?: string;
  isFromCachedSource?: boolean;
  cachedAt?: string;
  /** Set when the event comes from the FastAPI backend (src/lib/backend.ts). */
  joinUrl?: string;
  passcode?: string;
  organizer?: string;
  cancelled?: boolean;
  /** "LEC 15 27/11": what the leave-request agent needs to find the session. */
  leaveHint?: string;
}

export type SourceStatus = "connected" | "needs_reconnect" | "disconnected";

export interface CalendarSource {
  id: "outlook" | "phoenix" | "ics";
  name: string;
  description: string;
  status: SourceStatus;
  statusLabel: string;
  lastUpdatedLabel: string;
  errorBanner?: string;
  actionLabel: string;
}

export const TODAY_DATE_KEY = "2026-11-27";
export const TODAY_HEADING_DATE = "Thứ Sáu, 27 tháng 11";

export const MOCK_WEEK_DAYS: DateStripItem[] = [
  {
    key: "2026-11-23",
    weekdayLabel: "T2",
    dayNumber: 23,
    fullDateLabel: "Thứ Hai, 23 tháng 11 (Nghỉ lễ)",
    hasEvents: false,
  },
  {
    key: "2026-11-24",
    weekdayLabel: "T3",
    dayNumber: 24,
    fullDateLabel: "Thứ Ba, 24 tháng 11 (Nghỉ lễ)",
    hasEvents: false,
  },
  {
    key: "2026-11-25",
    weekdayLabel: "T4",
    dayNumber: 25,
    fullDateLabel: "Thứ Tư, 25 tháng 11",
    hasEvents: true,
  },
  {
    key: "2026-11-26",
    weekdayLabel: "T5",
    dayNumber: 26,
    fullDateLabel: "Thứ Năm, 26 tháng 11",
    hasEvents: true,
  },
  {
    key: "2026-11-27",
    weekdayLabel: "T6",
    dayNumber: 27,
    fullDateLabel: "Thứ Sáu, 27 tháng 11, hôm nay",
    isToday: true,
    hasEvents: true,
  },
  {
    key: "2026-11-28",
    weekdayLabel: "T7",
    dayNumber: 28,
    fullDateLabel: "Thứ Bảy, 28 tháng 11",
    hasEvents: true,
  },
  {
    key: "2026-11-29",
    weekdayLabel: "CN",
    dayNumber: 29,
    fullDateLabel: "Chủ Nhật, 29 tháng 11",
    hasEvents: false,
  },
];

export const DATE_LABEL_MAP: Record<string, string> = {
  "2026-11-05": "Thứ Năm, 5 tháng 11",
  "2026-11-06": "Thứ Sáu, 6 tháng 11",
  "2026-11-09": "Thứ Hai, 9 tháng 11",
  "2026-11-10": "Thứ Ba, 10 tháng 11",
  "2026-11-11": "Thứ Tư, 11 tháng 11",
  "2026-11-12": "Thứ Năm, 12 tháng 11",
  "2026-11-13": "Thứ Sáu, 13 tháng 11",
  "2026-11-14": "Thứ Bảy, 14 tháng 11",
  "2026-11-16": "Thứ Hai, 16 tháng 11",
  "2026-11-17": "Thứ Ba, 17 tháng 11",
  "2026-11-18": "Thứ Tư, 18 tháng 11",
  "2026-11-19": "Thứ Năm, 19 tháng 11",
  "2026-11-20": "Thứ Sáu, 20 tháng 11",
  "2026-11-21": "Thứ Bảy, 21 tháng 11",
  "2026-11-23": "Thứ Hai, 23 tháng 11 (Nghỉ lễ)",
  "2026-11-24": "Thứ Ba, 24 tháng 11 (Nghỉ lễ)",
  "2026-11-25": "Thứ Tư, 25 tháng 11",
  "2026-11-26": "Thứ Năm, 26 tháng 11",
  "2026-11-27": "Thứ Sáu, 27 tháng 11 (Hôm nay)",
  "2026-11-28": "Thứ Bảy, 28 tháng 11",
  "2026-11-29": "Chủ Nhật, 29 tháng 11",
  "2026-11-30": "Thứ Hai, 30 tháng 11",
};

export function parseSimpleRoom(rawCode?: string): SimpleRoomLocation | null {
  if (!rawCode) return null;
  const cleanCode = rawCode.trim().toUpperCase().replace(/\*+$/, "");
  const match = /^([A-Z])(\d)(\d{2})$/.exec(cleanCode);
  if (!match) return null;
  const buildingCode = match[1];
  const floor = Number(match[2]);
  const buildingLabel =
    buildingCode === "H" ? "Tòa H (H2)" : `Tòa ${buildingCode}`;
  const floorLabel = `Tầng ${floor}`;
  return {
    rawCode,
    cleanCode,
    buildingCode,
    buildingLabel,
    floor,
    floorLabel,
    fullLabel: `${buildingLabel} · ${floorLabel} · Phòng ${cleanCode}`,
  };
}

/**
 * Unified schedule events combining AI20K Cohort V (L3A) public timetable
 * with Outlook/Phoenix workshop, office hour, mentor duty & deadline feeds.
 * Note: `mentor` is only included on Workshop, Office Hour, Mentor Duty, or Coaching.
 */
export const MOCK_EVENTS: ScheduleEvent[] = [
  {
    id: "evt-nov05-kg",
    dateKey: "2026-11-05",
    dateLabel: "Thứ Năm, 5 tháng 11, 2026",
    title: "Khai giảng AI20K Cohort 5",
    category: "session",
    startTime: "09:00",
    endTime: "12:00",
    timeRange: "09:00 – 12:00",
    formatLabel: "Trực tiếp · Tòa B",
    formatDetail: "Hội trường lớn Auditorium — Tòa B",
    description:
      "Lễ khai giảng chương trình AI20K Khóa V và phổ biến lộ trình giai đoạn 1.",
    sources: ["Phoenix", "Outlook"],
    updatedAt: "Cập nhật 05/11",
    roomCode: "B101",
    allRooms: ["B101"],
    groupId: "L3A",
    ctaLabel: "Xem thông tin buổi học",
  },
  {
    id: "evt-nov05-lec1",
    dateKey: "2026-11-05",
    dateLabel: "Thứ Năm, 5 tháng 11, 2026",
    title: "LEC 1: Nền tảng AI & Prompt Engineering",
    category: "session",
    startTime: "14:00",
    endTime: "18:00",
    timeRange: "14:00 – 18:00",
    formatLabel: "Phòng H209 · Tòa H",
    formatDetail: "Học trực tiếp tại Tòa H (H2), Tầng 2 · Phòng H209",
    description: "Buổi lý thuyết mở đầu cho lớp L3A tại cụm giảng đường H2.",
    sources: ["Phoenix"],
    updatedAt: "Cập nhật 05/11",
    roomCode: "H209",
    allRooms: ["H209", "H210", "H203*"],
    groupId: "L3A",
    ctaLabel: "Mở tài liệu buổi học",
  },
  {
    id: "evt-nov06-lab1",
    dateKey: "2026-11-06",
    dateLabel: "Thứ Sáu, 6 tháng 11, 2026",
    title: "LAB 1: Thực hành bài tập đầu tiên",
    category: "officehour",
    startTime: "09:00",
    endTime: "13:00",
    timeRange: "09:00 – 13:00",
    formatLabel: "Phòng H201 · Tòa H",
    formatDetail: "Thực hành trực tiếp tại Tòa H (H2), Tầng 2 · Phòng H201",
    description: "Thực hành theo nhóm phòng tại cụm H2, E3 và C.",
    sources: ["Phoenix"],
    updatedAt: "Cập nhật 06/11",
    roomCode: "H201",
    allRooms: ["H201", "H202", "E305", "H104", "C304", "C104"],
    groupId: "L3A",
    ctaLabel: "Xem phân phòng",
  },
  {
    id: "evt-nov10-lab3",
    dateKey: "2026-11-10",
    dateLabel: "Thứ Ba, 10 tháng 11, 2026",
    title: "LAB 3: Embedding & Chunking",
    category: "officehour",
    startTime: "09:00",
    endTime: "13:00",
    timeRange: "09:00 – 13:00",
    formatLabel: "Phòng C401 · Tòa C",
    formatDetail: "Học trực tiếp tại Tòa C, Tầng 4 · Phòng C401",
    description: "So sánh chiến lược chia đoạn tài liệu và truy hồi ngữ nghĩa.",
    sources: ["Phoenix"],
    updatedAt: "Cập nhật 10/11",
    roomCode: "C401",
    allRooms: ["C401", "H201", "E305"],
    groupId: "L3A",
    ctaLabel: "Xem hướng dẫn lab",
  },
  {
    id: "evt-nov13-lab6",
    dateKey: "2026-11-13",
    dateLabel: "Thứ Sáu, 13 tháng 11, 2026",
    title: "LAB 6: Đánh giá truy hồi",
    category: "officehour",
    startTime: "16:30",
    endTime: "20:00",
    timeRange: "16:30 – 20:00",
    formatLabel: "Phòng E305 · Tòa E",
    formatDetail: "Học trực tiếp tại Tòa E, Tầng 3 · Phòng E305",
    description: "Thực hành đo precision/recall trên tập dữ liệu học phần.",
    sources: ["Phoenix"],
    updatedAt: "Cập nhật 13/11",
    roomCode: "E305",
    allRooms: ["H201", "H202", "E305", "H104", "C301"],
    groupId: "L3A",
    ctaLabel: "Xem hướng dẫn lab",
  },
  {
    id: "evt-nov17-workshop",
    dateKey: "2026-11-17",
    dateLabel: "Thứ Ba, 17 tháng 11, 2026",
    title: "Workshop: Kiểm thử hệ thống RAG",
    category: "coaching",
    startTime: "16:00",
    endTime: "19:30",
    timeRange: "16:00 – 19:30",
    formatLabel: "Phòng C401 · Tòa C",
    formatDetail: "Học trực tiếp tại Tòa C, Tầng 4 · Phòng C401",
    mentor: "Trần Minh Quân · Mentor chuyên môn",
    description: "Rà soát pipeline đánh giá RAG và phản hồi theo từng nhóm.",
    sources: ["Outlook", "Phoenix"],
    updatedAt: "Cập nhật 17/11",
    roomCode: "C401",
    allRooms: ["C401", "H201", "H202"],
    groupId: "L3A",
    ctaLabel: "Xem phân phòng",
  },
  {
    id: "evt-nov19-deadline",
    dateKey: "2026-11-19",
    dateLabel: "Thứ Năm, 19 tháng 11, 2026",
    title: "Hạn nộp Dự án giữa khóa",
    category: "deadline",
    startTime: "23:59",
    endTime: "23:59",
    timeRange: "Trước 23:59",
    formatLabel: "Nộp trực tuyến",
    formatDetail: "Cổng nộp bài khóa học",
    description: "Hoàn thiện tài liệu kiến trúc và video demo luồng tìm kiếm.",
    sources: ["Outlook"],
    updatedAt: "Cập nhật 18/11",
    ctaLabel: "Mở trang nộp bài",
  },
  {
    id: "evt-nov21-lec13",
    dateKey: "2026-11-21",
    dateLabel: "Thứ Bảy, 21 tháng 11, 2026",
    title: "LEC 13: Kiến trúc đa tác tử",
    category: "session",
    startTime: "09:00",
    endTime: "13:00",
    timeRange: "09:00 – 13:00",
    formatLabel: "Phòng D301 · Khu D",
    formatDetail: "Học trực tiếp tại Khu D, Tầng 3 · Phòng D301",
    description: "Phân chia phòng học lý thuyết tại H209, D301 và D302.",
    sources: ["Phoenix"],
    updatedAt: "Cập nhật 21/11",
    roomCode: "D301",
    allRooms: ["H209", "D301", "D302"],
    groupId: "L3A",
    ctaLabel: "Xem phân phòng",
  },
  // Thứ Tư 25/11/2026
  {
    id: "evt-nov25-lec14",
    dateKey: "2026-11-25",
    dateLabel: "Thứ Tư, 25 tháng 11, 2026",
    title: "LEC 14: Đánh giá Agent (Trực tuyến)",
    category: "session",
    startTime: "09:00",
    endTime: "13:00",
    timeRange: "09:00 – 13:00",
    formatLabel: "Trực tuyến",
    formatDetail: "Học trực tuyến qua Zoom",
    description: "Buổi lý thuyết trực tuyến buổi sáng cho lớp L3A.",
    sources: ["Phoenix"],
    updatedAt: "Cập nhật 25/11",
    groupId: "L3A",
    ctaLabel: "Vào lớp",
  },
  {
    id: "evt-nov25-lab14",
    dateKey: "2026-11-25",
    dateLabel: "Thứ Tư, 25 tháng 11, 2026",
    title: "LAB 14: Thực hành Agent",
    category: "officehour",
    startTime: "14:00",
    endTime: "18:00",
    timeRange: "14:00 – 18:00",
    formatLabel: "Phòng H209 · Tòa H",
    formatDetail: "Học trực tiếp tại Tòa H (H2), Tầng 2 · Phòng H209",
    description: "Thực hành trực tiếp buổi chiều tại các phòng H209, H210, H207, H208.",
    sources: ["Phoenix", "Outlook"],
    updatedAt: "Cập nhật 25/11",
    roomCode: "H209",
    allRooms: ["H209", "H210", "H207", "H208"],
    groupId: "L3A",
    ctaLabel: "Xem phân phòng",
  },
  // Thứ Năm 26/11/2026
  {
    id: "evt-nov26-officehour",
    dateKey: "2026-11-26",
    dateLabel: "Thứ Năm, 26 tháng 11, 2026",
    title: "Office Hour: Hỏi đáp kiến trúc hệ thống",
    category: "officehour",
    startTime: "14:00",
    endTime: "18:00",
    timeRange: "14:00 – 18:00",
    formatLabel: "Phòng H210 · Tòa H",
    formatDetail: "Học trực tiếp tại Tòa H (H2), Tầng 2 · Phòng H210",
    mentor: "Nguyễn Minh Anh · Lab Coach",
    description: "Phiên Office Hour hỗ trợ giải đáp thắc mắc trước ngày Hackathon.",
    sources: ["Phoenix"],
    updatedAt: "Cập nhật 26/11",
    roomCode: "H210",
    allRooms: ["H209", "H210", "H204", "H208"],
    groupId: "L3B",
    ctaLabel: "Xem phân phòng",
  },
  {
    id: "evt-nov26-deadline",
    dateKey: "2026-11-26",
    dateLabel: "Thứ Năm, 26 tháng 11, 2026",
    title: "Hạn nộp Đề cương bài tập lớn",
    category: "deadline",
    startTime: "23:59",
    endTime: "23:59",
    timeRange: "Trước 23:59",
    formatLabel: "Nộp trực tuyến",
    formatDetail: "Nộp tệp PDF trên cổng học tập",
    description: "Nộp bản mô tả bài toán, nguồn dữ liệu và tiêu chí đánh giá.",
    sources: ["Outlook"],
    updatedAt: "Cập nhật 25/11",
    ctaLabel: "Mở trang nộp bài",
  },
  // Hôm nay: Thứ Sáu 27/11/2026
  {
    id: "evt-nov27-lec15",
    dateKey: "2026-11-27",
    dateLabel: "Thứ Sáu, 27 tháng 11, 2026",
    title: "LEC 15: Triển khai & Đánh giá hệ thống AI",
    category: "session",
    startTime: "16:00",
    endTime: "19:30",
    timeRange: "16:00 – 19:30",
    formatLabel: "Phòng H209 · Tòa H",
    formatDetail: "Học trực tiếp tại Tòa H (H2), Tầng 2 · Phòng H209 (cùng H210)",
    description:
      "Buổi học lý thuyết cuối Phase 1 của lớp L3A, chuẩn bị cho ngày Hackathon 28/11.",
    sources: ["Phoenix", "Outlook"],
    updatedAt: "Cập nhật 15 phút trước",
    roomCode: "H209",
    allRooms: ["H209", "H210"],
    groupId: "L3A",
    ctaLabel: "Xem tài liệu buổi học",
  },
  {
    id: "evt-nov27-officehour",
    dateKey: "2026-11-27",
    dateLabel: "Thứ Sáu, 27 tháng 11, 2026",
    title: "Office Hour & Mentor Duty",
    category: "officehour",
    startTime: "19:00",
    endTime: "20:00",
    timeRange: "19:00 – 20:00",
    formatLabel: "Phòng H201 · Tòa H",
    formatDetail: "Trực tiếp tại Tòa H (H2), Tầng 2 · Phòng H201 (có hỗ trợ online)",
    mentor: "Nguyễn Minh Anh · Lab Coach",
    description:
      "Hỗ trợ gỡ lỗi bài thực hành Data Ingestion và chuẩn bị môi trường cho Hackathon.",
    sources: ["Phoenix"],
    updatedAt: "Dữ liệu lưu lúc 08:30",
    roomCode: "H201",
    allRooms: ["H201"],
    isFromCachedSource: true,
    cachedAt: "08:30 hôm nay",
    ctaLabel: "Vào phòng hỗ trợ",
  },
  {
    id: "evt-nov27-coaching",
    dateKey: "2026-11-27",
    dateLabel: "Thứ Sáu, 27 tháng 11, 2026",
    title: "Workshop: Thiết kế AI Agent",
    category: "coaching",
    startTime: "20:00",
    endTime: "21:30",
    timeRange: "20:00 – 21:30",
    formatLabel: "Trực tuyến",
    formatDetail: "Trực tuyến qua Zoom · Phòng học mở trước 10 phút",
    mentor: "Trần Minh Quân · Mentor chuyên môn AI Agent",
    description:
      "Rà soát kiến trúc luồng xử lý của bài thực hành tuần 4, giải đáp thắc mắc về thiết kế tool calling và kiểm thử độ ổn định.",
    sources: ["Outlook", "Phoenix"],
    updatedAt: "Cập nhật 10 phút trước",
    changeNote: "Đổi từ 19:30",
    previousTimeRange: "19:30 – 21:00",
    ctaLabel: "Vào lớp",
  },
  {
    id: "evt-nov27-deadline",
    dateKey: "2026-11-27",
    dateLabel: "Thứ Sáu, 27 tháng 11, 2026",
    title: "Hạn nộp Lab: Data Ingestion",
    category: "deadline",
    startTime: "23:59",
    endTime: "23:59",
    timeRange: "Trước 23:59 hôm nay",
    formatLabel: "Nộp trực tuyến",
    formatDetail: "Nộp bài trực tuyến trên cổng học tập",
    description:
      "Hoàn tất pipeline nạp dữ liệu từ PDF và Markdown kèm script kiểm tra tự động.",
    sources: ["Outlook"],
    updatedAt: "Cập nhật lúc 08:30",
    ctaLabel: "Mở trang nộp bài",
  },
  // Thứ Bảy 28/11/2026
  {
    id: "evt-nov28-review",
    dateKey: "2026-11-28",
    dateLabel: "Thứ Bảy, 28 tháng 11, 2026",
    title: "Mentor Duty: Ôn tập trước Hackathon",
    category: "officehour",
    startTime: "09:00",
    endTime: "10:30",
    timeRange: "09:00 – 10:30",
    formatLabel: "Phòng E305 · Tòa E",
    formatDetail: "Trực tiếp tại Tòa E, Tầng 3 · Phòng E305",
    mentor: "Phạm Thảo Vy · Mentor trực hỗ trợ",
    description:
      "Giải đáp thắc mắc kỹ thuật và kiểm tra hạ tầng cho các nhóm trước giờ thi Hackathon.",
    sources: ["Outlook", ".ics"],
    updatedAt: "Cập nhật lúc 14:15",
    roomCode: "E305",
    allRooms: ["E305"],
    ctaLabel: "Xem chi tiết",
  },
  {
    id: "evt-nov28-hackathon",
    dateKey: "2026-11-28",
    dateLabel: "Thứ Bảy, 28 tháng 11, 2026",
    title: "Hackathon AI20K — L3A",
    category: "session",
    startTime: "14:00",
    endTime: "18:00",
    timeRange: "14:00 – 18:00",
    formatLabel: "Phòng H209 · Tòa H",
    formatDetail:
      "Tập trung trực tiếp tại Tòa H (H2), Tầng 2 · Phòng H209, H210, H201",
    description:
      "Ngày thi Hackathon tổng kết Phase 1 cho lớp L3A tại cụm giảng đường Tòa H.",
    sources: ["Phoenix", "Outlook"],
    updatedAt: "Cập nhật 27/11",
    roomCode: "H209",
    allRooms: ["H209", "H210", "H201"],
    groupId: "L3A",
    ctaLabel: "Xem hướng dẫn Hackathon",
  },
  {
    id: "evt-nov28-deadline",
    dateKey: "2026-11-28",
    dateLabel: "Thứ Bảy, 28 tháng 11, 2026",
    title: "Hạn nộp Bài thi Hackathon",
    category: "deadline",
    startTime: "23:59",
    endTime: "23:59",
    timeRange: "Trước 23:59",
    formatLabel: "Nộp trực tuyến",
    formatDetail: "Nộp repo & bản chạy thử trên cổng khóa học",
    description: "Hoàn tất nộp bài đúng mốc kết thúc ngày Hackathon.",
    sources: ["Phoenix"],
    updatedAt: "Cập nhật 27/11",
    ctaLabel: "Mở trang nộp bài",
  },
  {
    id: "evt-nov30-phase2",
    dateKey: "2026-11-30",
    dateLabel: "Thứ Hai, 30 tháng 11, 2026",
    title: "Mở màn Giai đoạn 2 · Phase 2",
    category: "session",
    startTime: "19:00",
    endTime: "20:30",
    timeRange: "19:00 – 20:30",
    formatLabel: "Phòng B101 · Tòa B",
    formatDetail: "Hội trường Auditorium — Tòa B",
    description: "Giới thiệu lộ trình Phase 2 bắt đầu từ 30/11/2026.",
    sources: ["Outlook", "Phoenix"],
    updatedAt: "Cập nhật 27/11",
    roomCode: "B101",
    allRooms: ["B101"],
    ctaLabel: "Xem chi tiết",
  },
];

export const MOCK_SOURCES: CalendarSource[] = [
  {
    id: "outlook",
    name: "Outlook",
    description: "Nhận lịch học, thư mời workshop và hạn nộp từ email ban tổ chức",
    status: "connected",
    statusLabel: "Đã kết nối",
    lastUpdatedLabel: "Cập nhật 5 phút trước (dữ liệu mẫu)",
    actionLabel: "Quản lý",
  },
  {
    id: "phoenix",
    name: "Phoenix",
    description: "Đồng bộ buổi học, office hour và lịch mentor duty",
    status: "needs_reconnect",
    statusLabel: "Cần kết nối lại",
    lastUpdatedLabel: "Lần cuối: 08:30 hôm nay",
    errorBanner:
      "Phoenix tạm thời không cập nhật được. Hệ thống vẫn giữ lịch đã lưu lúc 08:30 hôm nay để bạn theo dõi.",
    actionLabel: "Thử lại",
  },
  {
    id: "ics",
    name: "Liên kết .ics",
    description: "Nhập URL lịch đăng ký từ câu lạc bộ hoặc nhóm học tập",
    status: "disconnected",
    statusLabel: "Chưa kết nối",
    lastUpdatedLabel: "Chưa có dữ liệu đồng bộ",
    actionLabel: "Kết nối",
  },
];

export function getEventsForDate(
  dateKey: string,
  options?: { includeDeadlines?: boolean },
): ScheduleEvent[] {
  const includeDeadlines = options?.includeDeadlines ?? true;
  return MOCK_EVENTS.filter((event) => {
    if (event.dateKey !== dateKey) return false;
    if (!includeDeadlines && event.category === "deadline") return false;
    return true;
  });
}

export function getNextUpcomingEvent(): ScheduleEvent {
  return (
    MOCK_EVENTS.find((event) => event.id === "evt-nov27-lec15") ??
    MOCK_EVENTS[0]
  );
}

export function getUpcomingDeadlines(): ScheduleEvent[] {
  return MOCK_EVENTS.filter(
    (event) =>
      event.category === "deadline" &&
      event.dateKey >= TODAY_DATE_KEY,
  );
}

export function getDateHeading(dateKey: string): string {
  if (DATE_LABEL_MAP[dateKey]) {
    return DATE_LABEL_MAP[dateKey];
  }
  const day = Number(dateKey.split("-")[2] ?? "1");
  return `Ngày ${day} tháng 11, 2026`;
}
