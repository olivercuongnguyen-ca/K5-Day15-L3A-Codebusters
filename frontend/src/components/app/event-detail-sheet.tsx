"use client";

import Link from "next/link";

import { parseSimpleRoom, type ScheduleEvent } from "@/data/mock-schedule";
import { VinUniCampusMapSvg } from "./vinuni-campus-map-svg";
import {
  Badge,
  BuildingIcon,
  Button,
  CalendarIcon,
  ClockIcon,
  CloudOffIcon,
  ExternalLinkIcon,
  LinkIcon,
  MailIcon,
  MapPinIcon,
  RefreshIcon,
  SchoolIcon,
  Sheet,
  UserIcon,
  VideoIcon,
} from "@/components/ui";

export interface EventDetailSheetProps {
  event: ScheduleEvent | null;
  onClose: () => void;
  onDemoAction: (actionLabel: string) => void;
  onRequestLeave?: (event: ScheduleEvent) => void;
}

const categoryLabelMap: Record<ScheduleEvent["category"], string> = {
  session: "Buổi học",
  coaching: "Workshop",
  officehour: "Hỗ trợ / Lab",
  duty: "Mentor duty",
  meeting: "Họp nhóm",
  deadline: "Hạn nộp",
};

const categoryVariantMap: Record<
  ScheduleEvent["category"],
  "secondary" | "primary" | "info" | "warning"
> = {
  session: "secondary",
  coaching: "primary",
  officehour: "info",
  duty: "info",
  meeting: "primary",
  deadline: "warning",
};

function renderSourceIcon(source: string) {
  if (source === "Outlook") {
    return <MailIcon size={15} className="text-primary" />;
  }
  if (source === "Phoenix") {
    return <SchoolIcon size={15} className="text-on-sage" />;
  }
  return <LinkIcon size={15} className="text-text-secondary" />;
}

export function EventDetailSheet({
  event,
  onClose,
  onDemoAction,
  onRequestLeave,
}: EventDetailSheetProps) {
  const roomLocation = event?.roomCode ? parseSimpleRoom(event.roomCode) : null;

  return (
    <Sheet
      open={Boolean(event)}
      placement="drawer"
      size="md"
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title={event?.title ?? ""}
      headerBadge={
        event ? (
          <>
            <Badge variant={categoryVariantMap[event.category]}>
              {categoryLabelMap[event.category]}
            </Badge>
            <Badge variant="secondary">{event.formatLabel}</Badge>
          </>
        ) : null
      }
      footer={
        event && (event.joinUrl || (event.category === "session" && onRequestLeave)) ? (
          <div className="flex flex-col gap-2">
            {event.joinUrl ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                leftIcon={<VideoIcon size={18} />}
                onClick={() => onDemoAction(event.ctaLabel)}
              >
                {event.ctaLabel}
              </Button>
            ) : null}
            {event.category === "session" && onRequestLeave ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                leftIcon={<MailIcon size={18} />}
                onClick={() => onRequestLeave(event)}
              >
                Xin nghỉ buổi này bằng AI
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      {event?.changeNote && event.previousTimeRange ? (
        <div className="flex flex-col gap-1 p-3 md:p-4 rounded-[14px] md:rounded-[16px] bg-warning-background text-on-warning">
          <div className="flex items-center gap-2">
            <ClockIcon size={16} className="shrink-0 md:w-[18px] md:h-[18px]" />
            <span className="text-[12px] md:text-[13px] leading-[18px] font-medium">
              Lịch học vừa thay đổi
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pl-6 text-[13.5px] md:text-[15px] leading-[20px] md:leading-[22px] tabular-nums">
            <span className="line-through opacity-75">
              {event.previousTimeRange}
            </span>
            <span aria-hidden="true">→</span>
            <span className="font-semibold">{event.timeRange}</span>
          </div>
        </div>
      ) : null}

      {event?.isFromCachedSource ? (
        <div className="flex items-start gap-2.5 p-3 md:p-3.5 rounded-[14px] md:rounded-[16px] bg-surface-subtle border border-border text-text-primary">
          <CloudOffIcon size={16} className="text-primary shrink-0 mt-0.5 md:w-[18px] md:h-[18px]" />
          <span className="text-[12px] md:text-[13px] leading-[18px] md:leading-[19px] text-text-secondary">
            Đang hiển thị từ dữ liệu đã lưu lúc{" "}
            <strong className="font-medium text-text-primary">
              {event.cachedAt}
            </strong>{" "}
            do Phoenix tạm thời chưa đồng bộ lại.
          </span>
        </div>
      ) : null}

      {event ? (
        <>
          <div className="flex flex-col gap-2.5 md:gap-3.5 text-[13.5px] leading-[20px] md:text-[15px] md:leading-[22px] text-text-primary">
            <div className="flex items-start gap-2.5 md:gap-3">
              <CalendarIcon
                size={17}
                className="text-primary shrink-0 mt-0.5 md:w-[19px] md:h-[19px]"
              />
              <div className="flex flex-col">
                <span>{event.dateLabel}</span>
                <span className="text-[12px] md:text-[13px] leading-[18px] md:leading-[20px] text-text-secondary tabular-nums">
                  {event.timeRange}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 md:gap-3">
              <VideoIcon size={17} className="text-primary shrink-0 mt-0.5 md:w-[19px] md:h-[19px]" />
              <span>{event.formatDetail}</span>
            </div>

            {event.mentor ? (
              <div className="flex items-start gap-2.5 md:gap-3">
                <UserIcon size={17} className="text-primary shrink-0 mt-0.5 md:w-[19px] md:h-[19px]" />
                <span>{event.mentor}</span>
              </div>
            ) : null}

            {/* Static 2D Campus Map Image when session has an on-campus room */}
            {roomLocation ? (
              <div className="p-3 md:p-4 rounded-[16px] md:rounded-[18px] bg-background border border-border flex flex-col gap-2.5 md:gap-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-text-primary">
                    <BuildingIcon
                      size={16}
                      className="text-primary shrink-0 md:w-[18px] md:h-[18px]"
                    />
                    <span className="text-[13px] md:text-[14px] font-semibold tabular-nums">
                      {roomLocation.fullLabel}
                    </span>
                  </div>
                  <Badge variant="secondary" size="sm">
                    {roomLocation.floorLabel}
                  </Badge>
                </div>

                {event.allRooms && event.allRooms.length > 1 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] text-text-secondary inline-flex items-center gap-1">
                      <MapPinIcon size={13} />
                      Các phòng cùng buổi:
                    </span>
                    {event.allRooms.map((rm) => (
                      <Badge key={rm} variant="outline" size="sm">
                        {rm}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <VinUniCampusMapSvg
                  activeBuilding={roomLocation.buildingCode}
                  roomCode={roomLocation.cleanCode}
                />
              </div>
            ) : null}

            <div className="pt-2.5 md:pt-3 border-t border-border flex flex-col gap-1">
              <span className="text-[12px] md:text-[13px] leading-[18px] font-medium text-text-primary">
                Nội dung buổi học
              </span>
              <p className="text-[13px] leading-[19px] md:text-[14px] md:leading-[21px] text-text-secondary text-pretty">
                {event.description}
              </p>
            </div>
          </div>

          <div className="p-3 md:p-4 rounded-[14px] md:rounded-[16px] bg-background border border-border flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-primary">
                <RefreshIcon size={15} className="text-text-secondary" />
                Nguồn thông tin
              </span>
              <span className="text-[12px] text-text-secondary">
                {event.updatedAt}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {event.sources.map((src) => (
                <Badge
                  key={src}
                  variant="outline"
                  size="md"
                  icon={renderSourceIcon(src)}
                >
                  {src}
                </Badge>
              ))}
            </div>
            <Link
              href="/settings#nguon-lich"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 self-start min-h-9 text-[13px] font-medium text-secondary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded"
            >
              <ExternalLinkIcon size={15} />
              Xem nguồn lịch
            </Link>
          </div>
        </>
      ) : null}
    </Sheet>
  );
}
