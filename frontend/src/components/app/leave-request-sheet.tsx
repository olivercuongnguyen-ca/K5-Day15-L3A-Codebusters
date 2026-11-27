"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MOCK_EVENTS, type ScheduleEvent } from "@/data/mock-schedule";
import { cn } from "@/lib/cn";
import {
  DEFAULT_LEAVE_RECIPIENT,
  buildLeaveEmailDraft,
  buildMailtoUrl,
  buildOutlookComposeUrl,
} from "@/lib/leave-email-draft";
import {
  Badge,
  Button,
  CalendarIcon,
  CheckCircleIcon,
  CopyIcon,
  ExternalLinkIcon,
  InfoIcon,
  Input,
  MailIcon,
  Sheet,
  type ToastTone,
} from "@/components/ui";
import { useApp } from "./app-provider";

export interface LeaveRequestSheetProps {
  open: boolean;
  initialEvent: ScheduleEvent | null;
  onClose: () => void;
  onToast: (message: string, tone?: ToastTone) => void;
}

const REASON_PRESETS = [
  "Bị ốm / đi khám bệnh",
  "Việc gia đình đột xuất",
  "Trùng lịch thi / hoạt động học thuật",
];

const EVIDENCE_PRESETS = [
  "Giấy khám bệnh / đơn thuốc",
  "Giấy xác nhận của phụ huynh",
  "Lịch thi / giấy xác nhận của trường",
];

function LeaveRequestForm({
  initialEvent,
  onClose,
  onToast,
}: {
  initialEvent: ScheduleEvent | null;
  onClose: () => void;
  onToast: (message: string, tone?: ToastTone) => void;
}) {
  const { currentUser } = useApp();

  const selectableEvents = useMemo(
    () => MOCK_EVENTS.filter((evt) => evt.category !== "deadline"),
    [],
  );

  const defaultEventId =
    initialEvent && initialEvent.category !== "deadline"
      ? initialEvent.id
      : (selectableEvents[0]?.id ?? "");

  const [selectedEventId, setSelectedEventId] = useState(defaultEventId);
  const [recipientEmail, setRecipientEmail] = useState(DEFAULT_LEAVE_RECIPIENT);
  const [reason, setReason] = useState("");
  const [hasEvidence, setHasEvidence] = useState(false);
  const [evidenceDetail, setEvidenceDetail] = useState("");
  const [touched, setTouched] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<"compose" | "preview">("compose");

  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const selectedEvent =
    selectableEvents.find((evt) => evt.id === selectedEventId) ??
    selectableEvents[0];

  const reasonMissing = touched && reason.trim().length === 0;
  const evidenceMissing =
    touched && hasEvidence && evidenceDetail.trim().length === 0;

  function handleGenerateDraft() {
    setTouched(true);
    if (!selectedEvent) return;
    if (reason.trim().length === 0) return;
    if (hasEvidence && evidenceDetail.trim().length === 0) return;

    setIsGenerating(true);
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const draft = buildLeaveEmailDraft({
        user: currentUser,
        event: selectedEvent,
        recipientEmail,
        reason,
        hasEvidence,
        evidenceDetail,
      });
      setDraftSubject(draft.subject);
      setDraftBody(draft.body);
      setIsGenerating(false);
      setStep("preview");
    }, 320);
  }

  function handleOpenOutlook() {
    const url = buildOutlookComposeUrl({
      to: recipientEmail,
      subject: draftSubject,
      body: draftBody,
    });
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    onToast(
      "Đã mở Outlook với thư xin nghỉ soạn sẵn — bạn chỉ cần kiểm tra và bấm Gửi.",
      "success",
    );
  }

  async function handleCopyDraft() {
    const fullText = `Đến: ${recipientEmail.trim() || DEFAULT_LEAVE_RECIPIENT}\nTiêu đề: ${draftSubject}\n\n${draftBody}`;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullText);
      }
    } catch {
      // Ignore clipboard failures in restricted contexts
    }
    onToast("Đã sao chép tiêu đề và nội dung thư xin nghỉ", "success");
  }

  const mailtoHref = buildMailtoUrl({
    to: recipientEmail,
    subject: draftSubject,
    body: draftBody,
  });

  return (
    <Sheet
      open
      placement="modal"
      size="lg"
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title={
        step === "compose"
          ? "Xin phép nghỉ học bằng AI"
          : "Xem trước thư xin nghỉ"
      }
      subtitle={
        step === "compose"
          ? "Điền nhanh thông tin buổi học, lý do và minh chứng để AI chuẩn bị sẵn thư gửi Outlook"
          : "Rà soát hoặc chỉnh sửa câu chữ lần cuối trước khi mở trên Outlook"
      }
      headerBadge={
        step === "compose" ? (
          <Badge variant="secondary">Bước 1/2 · Nhập thông tin</Badge>
        ) : (
          <>
            <Badge variant="secondary">Bản nháp AI</Badge>
            <Badge variant="warning">Chờ bạn duyệt trước khi gửi</Badge>
          </>
        )
      }
      footer={
        step === "compose" ? (
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={onClose}
              className="sm:min-w-[110px]"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={isGenerating}
              leftIcon={<MailIcon size={17} />}
              onClick={handleGenerateDraft}
              className="sm:min-w-[210px]"
            >
              {isGenerating ? "Đang tạo bản nháp..." : "Tạo bản nháp bằng AI"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-2.5">
            <div className="grid grid-cols-3 md:flex md:items-center gap-2">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setStep("compose")}
              >
                Chỉnh lý do
              </Button>
              <Button
                variant="outline"
                size="md"
                leftIcon={<CopyIcon size={15} />}
                onClick={handleCopyDraft}
              >
                Sao chép
              </Button>
              <a
                href={mailtoHref}
                className="inline-flex items-center justify-center rounded-full min-h-9 md:min-h-10 px-3.5 text-[12.5px] md:text-[13.5px] font-medium bg-surface text-text-primary border border-border hover:bg-surface-subtle transition-colors whitespace-nowrap"
              >
                App Mail
              </a>
            </div>
            <Button
              variant="primary"
              size="md"
              leftIcon={<ExternalLinkIcon size={17} />}
              onClick={handleOpenOutlook}
              className="w-full md:w-auto md:min-w-[230px]"
            >
              Mở trong Outlook để gửi
            </Button>
          </div>
        )
      }
    >
      {step === "compose" ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-start">
          {/* Left Column: Session, Recipient & Evidence */}
          <div className="md:col-span-5 flex flex-col gap-4 p-4 rounded-[18px] bg-background/85 border border-border/80">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="leave-session-select"
                className="text-[12.5px] md:text-[13px] font-medium text-text-primary flex items-center gap-1.5"
              >
                <CalendarIcon size={15} className="text-secondary shrink-0" />
                <span>Buổi học cần xin nghỉ</span>
              </label>
              <select
                id="leave-session-select"
                value={selectedEvent?.id ?? ""}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full min-h-10 md:min-h-11 rounded-[14px] border border-border bg-surface px-3 text-[13px] md:text-[14px] text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {selectableEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title} · {evt.dateLabel} ({evt.timeRange})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Gửi đến (Email giáo vụ / giảng viên)"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder={DEFAULT_LEAVE_RECIPIENT}
              leftIcon={<MailIcon size={16} />}
            />

            {/* Evidence toggle */}
            <div className="flex flex-col gap-2 pt-1">
              <span className="text-[12.5px] md:text-[13px] font-medium text-text-primary">
                Bạn có minh chứng kèm theo không?
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={!hasEvidence}
                  onClick={() => setHasEvidence(false)}
                  className={cn(
                    "min-h-9 md:min-h-10 px-2.5 rounded-full border text-[12px] md:text-[13px] font-medium transition-colors cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    !hasEvidence
                      ? "bg-sage-background border-olive text-on-sage"
                      : "bg-surface border-border text-text-secondary hover:text-text-primary",
                  )}
                >
                  Không có minh chứng
                </button>
                <button
                  type="button"
                  aria-pressed={hasEvidence}
                  onClick={() => setHasEvidence(true)}
                  className={cn(
                    "min-h-9 md:min-h-10 px-2.5 rounded-full border text-[12px] md:text-[13px] font-medium transition-colors cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    hasEvidence
                      ? "bg-sage-background border-olive text-on-sage"
                      : "bg-surface border-border text-text-secondary hover:text-text-primary",
                  )}
                >
                  Có minh chứng
                </button>
              </div>
            </div>

            {hasEvidence ? (
              <div className="flex flex-col gap-2 p-3.5 rounded-[14px] bg-surface-subtle border border-border">
                <Input
                  label="Minh chứng đó là gì?"
                  type="text"
                  value={evidenceDetail}
                  onChange={(e) => setEvidenceDetail(e.target.value)}
                  placeholder="Ví dụ: Ảnh giấy khám bệnh"
                  error={
                    evidenceMissing
                      ? "Vui lòng mô tả loại minh chứng sẽ đính kèm."
                      : undefined
                  }
                />
                <div className="flex flex-wrap gap-1.5">
                  {EVIDENCE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEvidenceDetail(preset)}
                      className="px-2.5 py-1 rounded-full bg-surface border border-border text-[11.5px] text-text-primary hover:bg-sage-background transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Right Column: Spacious Reason Editor + AI Notice */}
          <div className="md:col-span-7 flex flex-col gap-3.5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="leave-reason-input"
                className="text-[12.5px] md:text-[13px] font-medium text-text-primary"
              >
                Lý do xin nghỉ <span className="text-danger">*</span>
              </label>
              <textarea
                id="leave-reason-input"
                rows={5}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập chi tiết lý do xin nghỉ học của bạn (ví dụ: Em bị sốt cao từ tối qua và có lịch khám bác sĩ sáng nay nên không thể tham dự buổi học đúng giờ)..."
                aria-invalid={reasonMissing || undefined}
                className={cn(
                  "w-full min-h-[130px] md:min-h-[190px] rounded-[16px] border px-4 py-3 text-[14px] md:text-[15px] leading-[22px] text-text-primary placeholder:text-text-secondary/75 resize-y unify-scroll",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  reasonMissing
                    ? "bg-danger-background border-danger focus-visible:ring-danger"
                    : "bg-background border-border focus:border-primary focus-visible:ring-primary",
                )}
              />
              {reasonMissing ? (
                <p className="text-[12px] md:text-[13px] text-on-danger-background">
                  Vui lòng nhập lý do xin nghỉ để AI tạo bản nháp phù hợp.
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11.5px] text-text-secondary mr-1">
                  Gợi ý nhanh:
                </span>
                {REASON_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReason(preset)}
                    className="px-3 py-1 rounded-full bg-surface-subtle border border-border text-[12px] text-text-primary hover:bg-sage-background transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3.5 rounded-[14px] bg-surface-subtle/75 border border-border text-text-secondary">
              <InfoIcon size={17} className="text-secondary shrink-0 mt-0.5" />
              <p className="text-[12.5px] leading-[19px]">
                AI chỉ tạo bản nháp dựa trên thông tin buổi học và lý do bạn
                nhập để bạn xem trước. Hệ thống không tự ý gửi thư thay bạn.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
            <div className="md:col-span-5 flex flex-col gap-1.5">
              <span className="text-[12px] md:text-[13px] font-medium text-text-primary">
                Người nhận (Outlook)
              </span>
              <div className="min-h-10 md:min-h-12 px-3.5 rounded-[14px] md:rounded-[16px] bg-surface-subtle border border-border flex items-center text-[13.5px] md:text-[14px] font-medium text-text-primary truncate">
                {recipientEmail.trim() || DEFAULT_LEAVE_RECIPIENT}
              </div>
            </div>

            <div className="md:col-span-7">
              <Input
                label="Tiêu đề thư (có thể chỉnh sửa)"
                type="text"
                value={draftSubject}
                onChange={(e) => setDraftSubject(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="leave-preview-body"
              className="text-[12.5px] md:text-[13px] font-medium text-text-primary"
            >
              Nội dung thư (có thể chỉnh sửa trực tiếp)
            </label>
            <textarea
              id="leave-preview-body"
              rows={11}
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              className="w-full min-h-[240px] md:min-h-[300px] rounded-[16px] border border-border bg-background px-4 py-3 text-[13.5px] md:text-[14.5px] leading-[22px] text-text-primary unify-scroll focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          {hasEvidence && evidenceDetail.trim() ? (
            <div className="flex items-start gap-2.5 p-3.5 rounded-[14px] bg-warning-background text-on-warning">
              <CheckCircleIcon size={17} className="shrink-0 mt-0.5" />
              <p className="text-[12.5px] md:text-[13px] leading-[19px]">
                Sau khi chuyển sang Outlook, đừng quên đính kèm tệp minh chứng:{" "}
                <strong className="font-semibold">
                  {evidenceDetail.trim()}
                </strong>{" "}
                trước khi bấm <strong>Gửi</strong>.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}

export function LeaveRequestSheet({
  open,
  initialEvent,
  onClose,
  onToast,
}: LeaveRequestSheetProps) {
  if (!open) return null;

  return (
    <LeaveRequestForm
      key={initialEvent?.id ?? "default"}
      initialEvent={initialEvent}
      onClose={onClose}
      onToast={onToast}
    />
  );
}
