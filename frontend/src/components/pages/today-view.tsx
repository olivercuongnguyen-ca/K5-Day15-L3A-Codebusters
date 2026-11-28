"use client";

import { Fragment, useEffect, useRef, useState, type Ref } from "react";
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
import {
  NotificationsSheet,
  useStudentNotifications,
} from "@/components/app/notifications-sheet";
import { AdminDashboard } from "./admin-dashboard";
import { MentorDashboard } from "./mentor-dashboard";

function getDeadlineDayMeta(
  dateKey: string,
  todayKey: string,
): { label: string; variant: "danger" | "warning" | "neutral" } {
  if (!dateKey || !todayKey) return { label: "", variant: "neutral" };
  if (dateKey === todayKey) return { label: "Hôm nay", variant: "danger" };
  const base = new Date(`${todayKey}T00:00:00`);
  base.setDate(base.getDate() + 1);
  const tomorrowKey = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
  if (dateKey === tomorrowKey) return { label: "Ngày mai", variant: "warning" };
  return { label: `${dateKey.slice(8, 10)}/${dateKey.slice(5, 7)}`, variant: "neutral" };
}

/** Thin "now" marker between what already happened and what is next. */
function NowLine({ lineRef }: { lineRef: Ref<HTMLDivElement> }) {
  return (
    <div ref={lineRef} role="separator" aria-label="Bây giờ" className="flex items-center gap-2 py-0.5">
      <span className="w-2 h-2 rounded-full bg-danger shrink-0" aria-hidden="true" />
      <span className="text-[11px] leading-[14px] font-semibold uppercase tracking-[0.06em] text-danger">Bây giờ</span>
      <span className="flex-1 h-[2px] rounded-full bg-danger/70" aria-hidden="true" />
    </div>
  );
}

export function TodayView() {
  const { currentUser, student, staff, schedule, openEventDetail, openLeaveRequest, openMeetingSheet, preferences } =
    useApp();
  const TODAY_DATE_KEY = schedule.todayKey;
  const [pickedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const selectedDateKey = pickedDateKey ?? TODAY_DATE_KEY;  // follows today until the student picks a day
  const [notifOpen, setNotifOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    seenSet,
    loading: notifsLoading,
    refresh: refreshNotifs,
    markRead,
    markAllRead,
  } = useStudentNotifications();
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

  const dayEvents = schedule.getEventsForDate(selectedDateKey, {
    includeDeadlines: preferences.showDeadlinesInTimeline,
  });
  // today: everything already over goes above the "now" line (time order kept within each group), so an item that
  // ended stays above it even when it started together with one still running
  const visibleEvents = selectedDateKey === TODAY_DATE_KEY
    ? [...dayEvents.filter((e) => schedule.isPast(e)), ...dayEvents.filter((e) => !schedule.isPast(e))]
    : dayEvents;
  const weekDays = schedule.weekDays(selectedDateKey);

  const isTodaySelected = selectedDateKey === TODAY_DATE_KEY;
  const featuredLabel = nextEvent && schedule.isOngoing(nextEvent) ? "Đang diễn ra" : "Buổi học tiếp theo";

  // "now" line: before the first item that has not ended yet (after all of them if the day is over)
  const firstUpcoming = visibleEvents.findIndex((e) => !schedule.isPast(e));
  const nowIndex = firstUpcoming === -1 ? visibleEvents.length : firstUpcoming;
  const hasPast = isTodaySelected && nowIndex > 0;
  const timelineRef = useRef<HTMLDivElement>(null);
  const nowLineRef = useRef<HTMLDivElement>(null);
  const scrolledFor = useRef("");
  useEffect(() => {  // open the list at "now" once per day shown, not on every minute tick
    const box = timelineRef.current;
    const line = nowLineRef.current;
    const key = `${selectedDateKey}|${visibleEvents.length}`;
    if (!hasPast || !box || !line || scrolledFor.current === key) return;
    scrolledFor.current = key;
    box.scrollTo({ top: line.offsetTop - box.offsetTop - 4, behavior: "auto" });
  }, [hasPast, selectedDateKey, visibleEvents.length]);
  const hydrated = useHydrated();

  if (!hydrated) return <div aria-busy="true" className="min-h-[60dvh]" />;
  if (staff?.role === "admin") return <AdminDashboard />;
  if (staff?.role === "mentor") return <MentorDashboard />;

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
              Tạo lịch họp team
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<MailIcon size={15} />}
            onClick={() => openLeaveRequest(nextEvent?.category === "session" ? nextEvent : undefined)}
          >
            Xin nghỉ buổi học
          </Button>
          <div className="relative">
            <IconButton
              aria-label={
                unreadCount > 0
                  ? `Xem thông báo thay đổi lịch (${unreadCount} chưa đọc)`
                  : "Xem thông báo thay đổi lịch"
              }
              hasDot={unreadCount > 0 || Boolean(changedEvent)}
              pressed={notifOpen}
              icon={<BellIcon size={18} className="md:w-5 md:h-5" />}
              onClick={() => setNotifOpen(true)}
            />
            {unreadCount > 0 ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold inline-flex items-center justify-center tabular-nums shadow-sm"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </div>
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
      {changedEvent || (unreadCount > 0 && notifications[0]) ? (
        <div
          className={cn(
            "flex items-center justify-between gap-2.5 md:gap-3 px-3.5 py-2.5 md:px-4 md:py-3 rounded-[16px] md:rounded-[20px] bg-warning-background text-on-warning transition-shadow duration-[180ms]",
            unreadCount > 0 && "ring-1 ring-amber-400/70",
          )}
        >
          <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
            <ClockIcon size={17} className="shrink-0 md:w-[19px] md:h-[19px]" />
            <span className="text-[13px] md:text-[14px] leading-[18px] md:leading-[20px] text-pretty">
              {changedEvent ? (
                <>
                  <strong className="font-semibold">{changedEvent.title}</strong>
                  {" · "}
                  {changedEvent.changeNote}
                </>
              ) : (
                <>
                  <strong className="font-semibold">{notifications[0]?.title}</strong>
                  {" · "}
                  {notifications[0]?.body}
                </>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (unreadCount > 0) {
                setNotifOpen(true);
              } else if (changedEvent) {
                openEventDetail(changedEvent);
              }
            }}
            className="text-[12px] md:text-[13px] font-medium underline underline-offset-2 shrink-0 min-h-8 md:min-h-9 px-2 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {unreadCount > 1 ? `Xem (${unreadCount})` : "Chi tiết"}
          </button>
        </div>
      ) : null}

      {/* Mobile & Tablet Featured Card (hidden on lg+ because right aside shows it) */}
      {previewMode !== "loading" && nextEvent ? (
        <section aria-label={featuredLabel} className="lg:hidden">
          <EventCard
            variant="featured"
            featuredLabel={featuredLabel}
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
          <div
            ref={timelineRef}
            className={cn(
              "flex flex-col gap-2.5 md:gap-3",
              // today with past items: the list opens at "now"; scroll up to see what already happened
              hasPast && "max-h-[68dvh] lg:max-h-[72dvh] overflow-y-auto overscroll-contain scroll-smooth pr-1 -mr-1",
            )}
          >
            {visibleEvents.map((event, index) => {
              const past = schedule.isPast(event);
              return (
                <Fragment key={event.id}>
                  {isTodaySelected && index === nowIndex ? <NowLine lineRef={nowLineRef} /> : null}
                  <div className={cn(past && "opacity-80 transition-opacity")} aria-label={past ? "Đã qua hạn" : undefined}>
                    <EventCard
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
                      isPast={past}
                      onSelect={() => openEventDetail(event)}
                    />
                  </div>
                </Fragment>
              );
            })}
            {isTodaySelected && nowIndex === visibleEvents.length ? <NowLine lineRef={nowLineRef} /> : null}
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
          {upcomingDeadlines.map((item) => {
            const dayMeta = getDeadlineDayMeta(item.dateKey, TODAY_DATE_KEY);
            return (
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
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[13.5px] leading-[19px] md:text-[15px] md:leading-[21px] font-semibold text-text-primary truncate">
                        {item.title}
                      </span>
                      {dayMeta.label ? (
                        <Badge variant={dayMeta.variant} size="sm" className="shrink-0">
                          {dayMeta.label}
                        </Badge>
                      ) : null}
                    </div>
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
            );
          })}
        </div>
      </section>
      <NotificationsSheet
        open={notifOpen}
        onOpenChange={setNotifOpen}
        notifications={notifications}
        unreadCount={unreadCount}
        seenSet={seenSet}
        loading={notifsLoading}
        onRefresh={refreshNotifs}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onSelectDate={(dk) => setSelectedDateKey(dk)}
      />
    </div>
  );
}
