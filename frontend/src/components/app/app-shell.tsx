"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  MOCK_SOURCES,
  getNextUpcomingEvent,
  getUpcomingDeadlines,
} from "@/data/mock-schedule";
import {
  Badge,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  EventCard,
  SettingsIcon,
  TodayIcon,
} from "@/components/ui";
import { useApp } from "./app-provider";
import { NAV_ROUTES, type NavRouteItem } from "./snake-bottom-nav";

function renderSidebarIcon(key: NavRouteItem["key"]) {
  switch (key) {
    case "today":
      return <TodayIcon size={19} />;
    case "calendar":
      return <CalendarIcon size={19} />;
    case "settings":
      return <SettingsIcon size={19} />;
  }
}

export interface AppShellProps {
  children: ReactNode;
  hideRightAside?: boolean;
}

export function AppShell({ children, hideRightAside = false }: AppShellProps) {
  const pathname = usePathname();
  const { openEventDetail, currentUser } = useApp();

  const nextEvent = getNextUpcomingEvent();
  const upcomingDeadlines = getUpcomingDeadlines().slice(0, 2);
  const phoenixSource = MOCK_SOURCES.find((s) => s.id === "phoenix");

  return (
    <div className="min-h-dvh bg-background text-text-primary flex flex-col md:flex-row max-w-[1440px] w-full mx-auto pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {/* Tablet & Desktop Left Sidebar */}
      <aside
        aria-label="Thanh bên điều hướng"
        className="hidden md:flex md:flex-col md:justify-between md:w-56 lg:w-64 shrink-0 border-r border-border bg-surface/65 px-4 py-6 sticky top-0 h-dvh"
      >
        <div className="flex flex-col gap-6">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-3 px-2 py-1 rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-on-primary shadow-[0_4px_14px_rgba(92,67,117,0.22)] shrink-0">
              <CalendarIcon size={20} />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[16px] leading-[22px] font-semibold text-text-primary">
                Unify
              </span>
              <span className="text-[12px] leading-[16px] text-text-secondary">
                Lịch học hợp nhất
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav aria-label="Điều hướng chính" className="flex flex-col gap-1.5">
            {NAV_ROUTES.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 min-h-[44px] px-3.5 py-2.5 rounded-full text-[14px] leading-[20px] font-medium",
                    "transition-colors duration-[180ms] ease-out",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
                    isActive
                      ? "bg-sage-background text-on-sage"
                      : "text-text-secondary hover:bg-surface-subtle hover:text-text-primary",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-flex shrink-0",
                      isActive ? "text-secondary" : "text-text-secondary",
                    )}
                  >
                    {renderSidebarIcon(item.key)}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Summary + Login & Design System Links */}
        <div className="flex flex-col gap-2.5 pt-4 border-t border-border">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 p-2 rounded-[16px] hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container text-[13px] font-semibold inline-flex items-center justify-center shrink-0">
              {currentUser.initials}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-semibold text-text-primary truncate">
                {currentUser.name}
              </span>
              <span className="text-[12px] text-text-secondary truncate">
                {currentUser.roleLabel} · {currentUser.studentCode ?? currentUser.shortName}
              </span>
            </div>
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center justify-between px-3 py-2 rounded-full border border-border bg-background text-[12px] font-medium text-text-primary hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span>Đổi tài khoản / Đăng nhập</span>
            <ChevronRightIcon size={15} />
          </Link>

          <Link
            href="/design-system"
            className="inline-flex items-center justify-between px-3 py-2 rounded-full border border-border bg-surface text-[12px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span>Hệ thống thiết kế</span>
            <ChevronRightIcon size={15} />
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 px-4 sm:px-5 md:px-7 lg:px-8 pt-3 md:py-8 pb-[calc(92px+env(safe-area-inset-bottom))] md:pb-10">
        <div className={cn("mx-auto w-full", hideRightAside ? "max-w-4xl" : "max-w-3xl")}>
          {children}
        </div>
      </main>

      {/* Desktop Right Contextual Column (1024px–1440px+) */}
      {!hideRightAside ? (
        <aside
          aria-label="Buổi tiếp theo và hạn nộp"
          className="hidden lg:flex lg:flex-col lg:w-80 xl:w-[340px] shrink-0 gap-5 py-8 pr-6 xl:pr-8 sticky top-0 self-start"
        >
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

          <section
            aria-label="Hạn nộp sắp tới"
            className="bg-surface border border-border rounded-[24px] p-5 shadow-card flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[16px] leading-[24px] font-semibold text-text-primary">
                Sắp đến hạn
              </h2>
              <Badge variant="warning" size="sm">
                {upcomingDeadlines.length} mục
              </Badge>
            </div>

            <div className="flex flex-col gap-2.5">
              {upcomingDeadlines.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openEventDetail(item)}
                  className="w-full text-left p-3.5 rounded-[16px] bg-background border border-border hover:border-primary/50 hover:bg-surface-subtle/50 transition-colors duration-[180ms] flex items-center justify-between gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-[10px] bg-warning-background text-on-warning inline-flex items-center justify-center shrink-0 mt-0.5">
                      <ClockIcon size={16} />
                    </span>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[14px] leading-[20px] font-semibold text-text-primary truncate">
                        {item.title}
                      </span>
                      <span className="text-[12px] leading-[18px] text-text-secondary tabular-nums">
                        {item.timeRange} · {item.sources.join(", ")}
                      </span>
                    </div>
                  </div>
                  <ChevronRightIcon
                    size={18}
                    className="text-text-secondary shrink-0"
                  />
                </button>
              ))}
            </div>
          </section>

          <section
            aria-label="Tình trạng nguồn đồng bộ"
            className="bg-surface border border-border rounded-[24px] p-5 shadow-card flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[14px] font-semibold text-text-primary">
                Nguồn lịch
              </span>
              <Link
                href="/settings#nguon-lich"
                className="text-[13px] font-medium text-secondary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded"
              >
                Quản lý
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="success" dot>
                Outlook: Đã kết nối
              </Badge>
              <Badge variant="warning">
                Phoenix: {phoenixSource?.statusLabel}
              </Badge>
            </div>

            <p className="text-[12px] leading-[18px] text-text-secondary">
              Dữ liệu mẫu phục vụ trình diễn giao diện, chưa đồng bộ tài khoản
              thật.
            </p>
          </section>
        </aside>
      ) : null}
    </div>
  );
}
