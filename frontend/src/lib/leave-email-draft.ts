import type { DemoUserAccount } from "@/data/mock-accounts";
import type { ScheduleEvent } from "@/data/mock-schedule";

export const DEFAULT_LEAVE_RECIPIENT = "academic.ai20k@vinuni.edu.vn";

export interface LeaveDraftInput {
  user: Pick<DemoUserAccount, "name" | "studentCode">;
  event: ScheduleEvent;
  recipientEmail: string;
  reason: string;
  hasEvidence: boolean;
  evidenceDetail: string;
}

export interface LeaveEmailDraft {
  to: string;
  subject: string;
  body: string;
}

/**
 * Generates a formal Vietnamese leave request draft without fabricating facts
 * or automatically sending the email.
 */
export function buildLeaveEmailDraft(input: LeaveDraftInput): LeaveEmailDraft {
  const recipient = input.recipientEmail.trim() || DEFAULT_LEAVE_RECIPIENT;
  const studentName = input.user.name.trim();
  const studentCode = input.user.studentCode?.trim();
  const reasonText = input.reason.trim();
  const evidenceText = input.evidenceDetail.trim();
  const roomCode = input.event.roomCode?.trim();
  const hasRoomInFormat =
    Boolean(roomCode) &&
    input.event.formatDetail
      .toUpperCase()
      .includes(roomCode!.toUpperCase());
  const locationText =
    roomCode && !hasRoomInFormat
      ? `${input.event.formatDetail} (Phòng ${roomCode})`
      : input.event.formatDetail;

  const subject = `[ViUnify - Xin phép nghỉ học] ${studentName}${
    studentCode ? ` (${studentCode})` : ""
  } - ${input.event.title} (${input.event.dateLabel})`;

  const identityLines = [
    `Em tên là: ${studentName}`,
    studentCode ? `Mã học viên / MSSV: ${studentCode}` : null,
  ].filter(Boolean);

  const evidenceParagraph = input.hasEvidence
    ? `Minh chứng kèm theo: ${evidenceText}. Em xin phép được đính kèm minh chứng trực tiếp trong email này để Thầy/Cô đối chiếu.`
    : `Hiện tại em chưa có giấy tờ minh chứng kèm theo tại thời điểm gửi đơn. Em xin cam kết chủ động xem lại tài liệu, ghi chú buổi học và hoàn thành đầy đủ bài tập được giao.`;

  const body = [
    "Kính gửi Thầy/Cô và Ban quản lý chương trình,",
    "",
    ...identityLines,
    "",
    "Em viết thư này kính xin phép Thầy/Cô cho em được vắng mặt trong buổi học với thông tin cụ thể như sau:",
    `- Buổi học: ${input.event.title}`,
    `- Thời gian: ${input.event.dateLabel}, ${input.event.timeRange}`,
    `- Hình thức / Địa điểm: ${locationText}`,
    `- Lý do xin nghỉ: ${reasonText}`,
    "",
    evidenceParagraph,
    "",
    "Em xin chân thành cảm ơn sự xem xét và hỗ trợ của Thầy/Cô.",
    "",
    "Trân trọng,",
    studentName,
    studentCode ? `MSSV: ${studentCode}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return {
    to: recipient,
    subject,
    body,
  };
}

/**
 * Builds an Outlook Web compose deeplink pre-filled with recipient, subject, and body.
 * Uses encodeURIComponent (%20 for spaces) instead of URLSearchParams (+) so Outlook
 * renders Vietnamese spaces cleanly without literal "+" signs.
 */
export function buildOutlookComposeUrl(draft: LeaveEmailDraft): string {
  const to = encodeURIComponent(draft.to.trim());
  const subject = encodeURIComponent(draft.subject);
  const body = encodeURIComponent(draft.body);
  return `https://outlook.office.com/mail/deeplink/compose?to=${to}&subject=${subject}&body=${body}`;
}

/**
 * Builds a standard mailto URI fallback for native mobile mail apps (Outlook mobile / Apple Mail).
 */
export function buildMailtoUrl(draft: LeaveEmailDraft): string {
  const to = encodeURIComponent(draft.to.trim());
  const subject = encodeURIComponent(draft.subject);
  const body = encodeURIComponent(draft.body);
  return `mailto:${to}?subject=${subject}&body=${body}`;
}
