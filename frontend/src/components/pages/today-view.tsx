"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  Badge,
  BellIcon,
  Button,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  CloudOffIcon,
  DateStrip,
  EventCard,
  EventCardSkeleton,
  IconButton,
  MailIcon,
  VideoIcon,
} from "@/components/ui";
import { useApp, useHydrated } from "@/components/app/app-provider";

export function TodayView() {
  const { currentUser, student, schedule, openEventDetail, openLeaveRequest, openMeetingSheet, showToast, preferences } =
    useApp();
  const TODAY_DATE_KEY = schedule.todayKey;
  const [pickedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const selectedDateKey = pickedDateKey ?? TODAY_DATE_KEY;  // follows today until the student picks a day
  const [highlightBanner, setHighlightBanner] = useState(false);
  const { ensureWeek } = schedule;
  useEffect(() => { if (selectedDateKey) ensureWeek(selectedDateKey); }, [selectedDateKey, ensureWeek]);

  const previewMode = schedule.loading && schedule.events.length === 0 ? "loading" : "normal";
  const nextEvent = schedule.getNextUpcomingEvent();
  const upcomingDeadlines = schedule.getUpcomingDeadlines().slice(0, 2);
  // the first upcoming item with a change (room moved, mentor changed duty, cancelled)
  const changedEvent = schedule.events.find(
    (evt) => evt.changeNote && evt.changeNote !== "Trùng giờ" && `${evt.dateKey}` >= TODAY_DATE_KEY,
  );
  const phoenixMissing = Boolean(schedule.latestWeek && !schedule.latestWeek.phoenix_linked);

  const visibleEvents = schedule.getEventsForDate(selectedDateKey, {
    includeDeadlines: preferences.showDeadlinesInTimeline,
  });
  const weekDays = schedule.weekDays(selectedDateKey);

  const isTodaySelected = selectedDateKey === TODAY_DATE_KEY;
  const hydrated = useHydrated();

  if (!hydrated) return <div aria-busy="true" className="min-h-[60dvh]" />;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Top Header */}
      <header className="flex flex-wrap items-start justify-between gap-3 md:gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            <span className="text-[12px] md:text-[13px] leading-[18px] md:leading-[20px] text-text-secondary">
              {schedule.todayHeading}
            </span>
            <Badge variant={currentUser.role === "student" ? "secondary" : "primary"} size="sm">
              {currentUser.roleLabel}
            </Badge>
          </div>
          <h1 className="text-[22px] leading-[28px] md:text-[28px] md:leading-[36px] font-semibold tracking-[-0.3px] text-text-primary">
            Chào {currentUser.shortName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {student ? (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<VideoIcon size={15} />}
              onClick={openMeetingSheet}
            >
              Họp nhóm
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<MailIcon size={15} />}
            onClick={() => openLeaveRequest(nextEvent?.category === "session" ? nextEvent : undefined)}
          >
            Xin nghỉ AI
          </Button>
          <IconButton
            aria-label="Xem thông báo đổi lịch"
            hasDot={Boolean(changedEvent)}
            pressed={highlightBanner}
            icon={<BellIcon size={18} className="md:w-5 md:h-5" />}
            onClick={() => {
              setHighlightBanner((prev) => !prev);
              showToast(changedEvent ? `${changedEvent.title}: ${changedEvent.changeNote}` : "Không có thay đổi lịch nào sắp tới.",
                changedEvent ? "warning" : "info");
            }}
          />
        </div>
      </header>

      {/* Partial Error Banner (Phoenix failed, showing cached data) */}
      {phoenixMissing ? (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[20px] bg-danger-background text-on-danger-background border border-danger/20"
        >
          <div className="flex items-start gap-2.5">
            <CloudOffIcon size={20} className="shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] leading-[20px] font-semibold">
                Chưa kết nối lịch Phoenix
              </span>
              <span className="text-[13px] leading-[19px]">
                Đang hiển thị thời khoá biểu lớp. Kết nối Phoenix để thấy workshop, mentor duty và hạn nộp.
              </span>
            </div>
          </div>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center min-h-9 px-4 rounded-full border border-danger/30 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Kết nối
          </Link>
        </div>
      ) : null}

      {/* Schedule Change Banner */}
      {changedEvent ? (
        <div
          className={cn(
            "flex items-center justify-between gap-2.5 md:gap-3 px-3.5 py-2.5 md:px-4 md:py-3 rounded-[16px] md:rounded-[20px] bg-warning-background text-on-warning transition-shadow duration-[180ms]",
            highlightBanner && "ring-2 ring-primary",
          )}
        >
          <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
            <ClockIcon size={17} className="shrink-0 md:w-[19px] md:h-[19px]" />
            <span className="text-[13px] md:text-[14px] leading-[18px] md:leading-[20px] text-pretty">
              <strong className="font-semibold">{changedEvent.title}</strong>
              {" · "}
              {changedEvent.changeNote}
            </span>
          </div>
          <button
            type="button"
            onClick={() => openEventDetail(changedEvent)}
            className="text-[12px] md:text-[13px] font-medium underline underline-offset-2 shrink-0 min-h-8 md:min-h-9 px-2 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Chi tiết
          </button>
        </div>
      ) : null}

      {/* Mobile & Tablet Featured Card (hidden on lg+ because right aside shows it) */}
      {previewMode !== "loading" && nextEvent ? (
        <section aria-label="Buổi học tiếp theo" className="lg:hidden">
          <EventCard
            variant="featured"
            category={nextEvent.category}
            title={nextEvent.title}
            timeRange={nextEvent.timeRange}
            formatLabel={nextEvent.formatLabel}
            sources={nextEvent.sources}
            changeNote={nextEvent.changeNote}
            ctaLabel={nextEvent.ctaLabel}
            onCtaClick={() => openEventDetail(nextEvent)}
          />
        </section>
      ) : null}

      {/* 7-Day DateStrip */}
      <section aria-label="Chọn ngày trong tuần" className="flex flex-col gap-2.5 md:gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[14.5px] leading-[20px] md:text-[16px] md:leading-[24px] font-semibold text-text-primary">
            Lịch trong tuần
          </h2>
          <div className="flex items-center gap-2">
            {!isTodaySelected ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedDateKey(TODAY_DATE_KEY)}
              >
                Về hôm nay
              </Button>
            ) : (
              <span className="text-[12px] md:text-[13px] leading-[18px] md:leading-[20px] text-text-secondary">
                Tháng {Number(selectedDateKey.slice(5, 7))}, {selectedDateKey.slice(0, 4)}
              </span>
            )}
          </div>
        </div>

        <DateStrip
          items={weekDays}
          selectedKey={selectedDateKey}
          onSelect={(key) => setSelectedDateKey(key)}
        />
      </section>

      {/* Day Timeline */}
      <section aria-label="Timeline lịch học" className="flex flex-col gap-2.5 md:gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[14.5px] leading-[20px] md:text-[16px] md:leading-[24px] font-semibold text-text-primary">
            {schedule.getDateHeading(selectedDateKey)} ·{" "}
            <span className="tabular-nums">{visibleEvents.length}</span> sự kiện
          </h2>
        </div>

        {previewMode === "loading" ? (
          <div className="flex flex-col gap-2.5 md:gap-3" aria-busy="true">
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="bg-surface border border-border rounded-[20px] md:rounded-[24px] p-6 md:p-8 shadow-card-sm flex flex-col items-center text-center gap-2.5 md:gap-3">
            <span className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-sage-background text-on-sage inline-flex items-center justify-center">
              <CalendarIcon size={20} className="md:w-[22px] md:h-[22px]" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-[16px] leading-[22px] md:text-[18px] md:leading-[26px] font-semibold text-text-primary">
                {isTodaySelected
                  ? "Hôm nay chưa có buổi học nào"
                  : "Ngày này chưa có buổi học nào"}
              </h3>
              <p className="text-[13px] leading-[19px] md:text-[14px] md:leading-[21px] text-text-secondary max-w-sm text-pretty">
                Bạn có thể nghỉ ngơi hoặc chuyển sang xem toàn bộ lịch tuần và
                tháng để chuẩn bị trước.
              </p>
            </div>
            <Link
              href="/calendar"
              className="inline-flex items-center justify-center min-h-9 md:min-h-11 px-4 md:px-5 rounded-full bg-sage-background text-on-sage text-[13px] md:text-[14px] font-medium hover:bg-olive/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Xem lịch tuần
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 md:gap-3">
            {visibleEvents.map((event, index) => (
              <EventCard
                key={event.id}
                variant="timeline"
                showTimelineRail
                isLastInTimeline={index === visibleEvents.length - 1}
                category={event.category}
                title={event.title}
                startTime={event.startTime}
                timeRange={event.timeRange}
                formatLabel={event.formatLabel}
                sources={event.sources}
                changeNote={event.changeNote}
                onSelect={() => openEventDetail(event)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Mobile & Tablet Upcoming Deadlines (shown in right aside on lg+) */}
      <section aria-label="Sắp đến hạn" className="lg:hidden flex flex-col gap-2.5 md:gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[14.5px] leading-[20px] md:text-[16px] md:leading-[24px] font-semibold text-text-primary">
            Sắp đến hạn
          </h2>
          <Badge variant="warning" size="sm">
            {upcomingDeadlines.length} mục
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
          {upcomingDeadlines.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openEventDetail(item)}
              className="w-full text-left bg-surface border border-border rounded-[16px] md:rounded-[20px] p-3 md:p-4 shadow-card-sm hover:border-secondary/45 transition-colors duration-[180ms] flex items-center justify-between gap-2.5 md:gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                <span className="w-8 h-8 md:w-10 md:h-10 rounded-[12px] md:rounded-[14px] bg-warning-background text-on-warning inline-flex items-center justify-center shrink-0">
                  <ClockIcon size={16} className="md:w-[18px] md:h-[18px]" />
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13.5px] leading-[19px] md:text-[15px] md:leading-[21px] font-semibold text-text-primary truncate">
                    {item.title}
                  </span>
                  <span className="text-[12px] leading-[17px] md:text-[13px] md:leading-[19px] text-text-secondary tabular-nums">
                    {item.timeRange} · {item.sources.join(", ")}
                  </span>
                </div>
              </div>
              <ChevronRightIcon
                size={16}
                className="text-text-secondary shrink-0 md:w-[18px] md:h-[18px]"
              />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
