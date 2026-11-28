"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScheduleEvent } from "@/data/mock-schedule";
import { addDays, mondayOf } from "@/lib/backend";
import { cn } from "@/lib/cn";
import {
  Badge,
  Button,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EventCard,
  IconButton,
  type EventCategory,
  Tabs,
} from "@/components/ui";
import { useApp, useHydrated } from "@/components/app/app-provider";

type EventFilter = "all" | EventCategory;

const FILTER_OPTIONS: Array<{ key: EventFilter; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "session", label: "Buổi học" },
  { key: "coaching", label: "Coaching" },
  { key: "officehour", label: "Trực hỗ trợ" },
  { key: "duty", label: "Mentor duty" },
  { key: "meeting", label: "Họp team" },
  { key: "deadline", label: "Hạn nộp" },
];

const WEEKDAY_HEADERS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Empty-day text that names what the filter shows, e.g. "Không có mentor duty". */
const EMPTY_LABEL: Record<EventFilter, string> = {
  all: "Không có lịch",
  session: "Không có buổi học",
  coaching: "Không có coaching / workshop",
  officehour: "Không có giờ trực hỗ trợ",
  duty: "Không có mentor duty",
  meeting: "Không có họp team",
  deadline: "Không có hạn nộp",
};

function monthGrid(monthKey: string) {
  const first = new Date(`${monthKey}-01T00:00:00`);
  const leading = (first.getDay() + 6) % 7; // Monday-first grid
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: count }, (_, index) => {
    const day = index + 1;
    return { day, dateKey: `${monthKey}-${String(day).padStart(2, "0")}` };
  });
  return { leading, days };
}

export function CalendarView() {
  const { openEventDetail, showToast, schedule } = useApp();
  const TODAY_DATE_KEY = schedule.todayKey;
  const getDateHeading = schedule.getDateHeading;
  const [viewMode, setViewMode] = useState<string>("month");
  const [filter, setFilter] = useState<EventFilter>("all");
  const [pickedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const selectedDateKey = pickedDateKey ?? TODAY_DATE_KEY;
  const monthKey = selectedDateKey.slice(0, 7);
  const { leading: MONTH_LEADING_BLANKS, days: MONTH_DAYS } = useMemo(() => monthGrid(monthKey), [monthKey]);
  const MONTH_LABEL = `Tháng ${Number(monthKey.slice(5, 7))}, ${monthKey.slice(0, 4)}`;
  const WEEK_DAYS = schedule.weekDays(selectedDateKey);

  const { ensureWeek } = schedule;
  useEffect(() => {  // load every week this month touches
    if (!selectedDateKey) return;
    for (let key = mondayOf(`${monthKey}-01`); key.slice(0, 7) <= monthKey; key = addDays(key, 7)) ensureWeek(key);
  }, [monthKey, ensureWeek]);

  const filteredEvents = useMemo(() => {
    return schedule.events.filter(
      (evt) => filter === "all" || evt.category === filter,
    );
  }, [filter, schedule.events]);

  const eventsByDateMap = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const evt of filteredEvents) {
      const existing = map.get(evt.dateKey) ?? [];
      existing.push(evt);
      map.set(evt.dateKey, existing);
    }
    return map;
  }, [filteredEvents]);

  const selectedDayEvents = eventsByDateMap.get(selectedDateKey) ?? [];
  const hydrated = useHydrated();

  /** Month view: previous / next month (today if it is in that month, else the 1st). Week view: ±7 days. */
  function shift(step: -1 | 1) {
    if (viewMode === "week") return setSelectedDateKey(addDays(selectedDateKey, 7 * step));
    const [y, m] = monthKey.split("-").map(Number);
    const d = new Date(y, m - 1 + step, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setSelectedDateKey(TODAY_DATE_KEY.startsWith(key) ? TODAY_DATE_KEY : `${key}-01`);
  }

  function handleJumpToday() {
    setSelectedDateKey(TODAY_DATE_KEY);
    showToast("Đã chuyển về hôm nay", "info");
  }

  if (!hydrated) return <div aria-busy="true" className="min-h-[60dvh]" />;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 md:gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[20px] leading-[26px] md:text-[26px] md:leading-[34px] font-semibold tracking-[-0.2px] text-text-primary">
            {MONTH_LABEL}
          </h1>
          <span className="text-[12px] leading-[18px] md:text-[13px] md:leading-[20px] text-text-secondary">
            Lịch học hợp nhất theo tuần và tháng
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <IconButton
            aria-label={viewMode === "week" ? "Tuần trước" : "Tháng trước"}
            icon={<ChevronLeftIcon size={18} />}
            onClick={() => shift(-1)}
          />
          <Button variant="secondary" size="sm" onClick={handleJumpToday}>
            Hôm nay
          </Button>
          <IconButton
            aria-label={viewMode === "week" ? "Tuần sau" : "Tháng sau"}
            icon={<ChevronRightIcon size={18} />}
            onClick={() => shift(1)}
          />
        </div>
      </header>

      {/* Segmented Control: Tuần / Tháng */}
      <Tabs
        ariaLabel="Chế độ xem lịch"
        value={viewMode}
        onValueChange={setViewMode}
        items={[
          { value: "week", label: "Tuần" },
          { value: "month", label: "Tháng" },
        ]}
      />

      {/* Filter Chips */}
      <div
        role="group"
        aria-label="Lọc theo loại sự kiện"
        className="flex flex-wrap items-center gap-1.5 md:gap-2"
      >
        {FILTER_OPTIONS.map((option) => {
          const isSelected = filter === option.key;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setFilter(option.key)}
              className={cn(
                "min-h-8 md:min-h-10 px-3 md:px-4 rounded-full text-[12px] md:text-[13px] leading-[16px] md:leading-[18px] font-medium transition-colors duration-[180ms] cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                isSelected
                  ? "bg-primary text-on-primary shadow-[0_4px_12px_rgba(23,23,25,0.16)]"
                  : "bg-surface border border-border text-text-primary hover:bg-surface-subtle",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Month View */}
      {viewMode === "month" ? (
        <div className="flex flex-col gap-4 md:gap-6">
          <section
            aria-label={`Lịch ${MONTH_LABEL.toLowerCase()}`}
            className="bg-surface border border-border rounded-[20px] md:rounded-[24px] p-3 sm:p-5 shadow-card-sm"
          >
            <div className="grid grid-cols-7 text-center pb-1.5 sm:pb-2">
              {WEEKDAY_HEADERS.map((wd) => (
                <span
                  key={wd}
                  className="text-[11px] sm:text-[12px] leading-[16px] font-medium text-text-secondary py-1"
                >
                  {wd}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
              {Array.from({ length: MONTH_LEADING_BLANKS }).map((_, idx) => (
                <span key={`blank-${idx}`} aria-hidden="true" />
              ))}

              {MONTH_DAYS.map(({ day, dateKey }) => {
                const dayEvents = eventsByDateMap.get(dateKey) ?? [];
                const isToday = dateKey === TODAY_DATE_KEY;
                const isSelected = dateKey === selectedDateKey;
                const hasDeadline = dayEvents.some(
                  (e) => e.category === "deadline",
                );

                return (
                  <button
                    key={dateKey}
                    type="button"
                    aria-pressed={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={`${getDateHeading(dateKey)}, ${dayEvents.length} sự kiện`}
                    onClick={() => setSelectedDateKey(dateKey)}
                    className={cn(
                      "relative min-h-[38px] h-9 sm:h-12 flex flex-col items-center justify-center rounded-full text-[13.5px] sm:text-[15px] tabular-nums transition-colors duration-[180ms] cursor-pointer",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
                      isSelected
                        ? "bg-sage-background text-on-sage font-semibold border border-olive"
                        : isToday
                          ? "border-2 border-primary text-primary font-semibold hover:bg-surface-subtle"
                          : "text-text-primary hover:bg-surface-subtle",
                    )}
                  >
                    <span>{day}</span>
                    {dayEvents.length > 0 ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full absolute bottom-1 sm:bottom-1.5",
                          hasDeadline
                            ? "bg-primary"
                            : "bg-olive",
                        )}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4 pt-2.5 sm:pt-3 mt-2.5 sm:mt-3 border-t border-border text-[11px] sm:text-[12px] text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-primary" />
                Hôm nay
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sage-background border border-olive" />
                Đang chọn
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-olive" />
                Có buổi học
              </span>
            </div>
          </section>

          {/* Selected Day Event List */}
          <section
            aria-label="Sự kiện trong ngày đang chọn"
            className="flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[14.5px] leading-[20px] md:text-[16px] md:leading-[24px] font-semibold text-text-primary">
                {getDateHeading(selectedDateKey)}
              </h2>
              <Badge variant="neutral" size="sm">
                {selectedDayEvents.length} sự kiện
              </Badge>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="bg-surface border border-border rounded-[20px] p-6 flex flex-col items-center text-center gap-2">
                <CalendarIcon size={22} className="text-text-secondary" />
                <p className="text-[15px] font-medium text-text-primary">
                  {EMPTY_LABEL[filter]} trong ngày này
                </p>
                <p className="text-[13px] text-text-secondary">
                  {filter === "all" ? "Thử chọn ngày khác trên lịch." : "Thử chọn ngày khác trên lịch hoặc chuyển bộ lọc về Tất cả."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {selectedDayEvents.map((evt) => (
                  <EventCard
                    key={evt.id}
                    variant="timeline"
                    category={evt.category}
                    title={evt.title}
                    timeRange={evt.timeRange}
                    formatLabel={evt.formatLabel}
                    sources={evt.sources}
                    changeNote={evt.changeNote}
                    isPast={schedule.isPast(evt)}
                    onSelect={() => openEventDetail(evt)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        /* Week View (23/11 – 29/11) */
        <section aria-label="Lịch tuần hiện tại" className="flex flex-col gap-5">
          {WEEK_DAYS.map((dayItem) => {
            const dayEvents = eventsByDateMap.get(dayItem.key) ?? [];
            const isToday = dayItem.key === TODAY_DATE_KEY;

            return (
              <div key={dayItem.key} className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h2
                    className={cn(
                      "text-[15px] leading-[22px] font-semibold",
                      isToday ? "text-primary" : "text-text-primary",
                    )}
                  >
                    {getDateHeading(dayItem.key)}
                  </h2>
                  <span className="text-[12px] text-text-secondary tabular-nums">
                    {dayEvents.length} sự kiện
                  </span>
                </div>

                {dayEvents.length === 0 ? (
                  <div className="p-4 rounded-[16px] bg-surface/65 border border-dashed border-border text-[13px] text-text-secondary">
                    {EMPTY_LABEL[filter]}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {dayEvents.map((evt) => (
                      <EventCard
                        key={evt.id}
                        variant="timeline"
                        showTimelineRail
                        isLastInTimeline={
                          evt.id === dayEvents[dayEvents.length - 1]?.id
                        }
                        category={evt.category}
                        title={evt.title}
                        startTime={evt.startTime}
                        timeRange={evt.timeRange}
                        formatLabel={evt.formatLabel}
                        sources={evt.sources}
                        changeNote={evt.changeNote}
                        isPast={schedule.isPast(evt)}
                        onSelect={() => openEventDetail(evt)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
