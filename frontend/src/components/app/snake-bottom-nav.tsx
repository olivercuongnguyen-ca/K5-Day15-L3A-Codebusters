"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  CalendarIcon,
  SettingsIcon,
  TodayIcon,
} from "@/components/ui";

export interface NavRouteItem {
  href: string;
  label: string;
  key: "today" | "calendar" | "settings";
}

export const NAV_ROUTES: NavRouteItem[] = [
  { href: "/", label: "Hôm nay", key: "today" },
  { href: "/calendar", label: "Lịch", key: "calendar" },
  { href: "/settings", label: "Cài đặt", key: "settings" },
];

interface SnakePillState {
  leftPct: number;
  widthPct: number;
  phase: "idle" | "stretch" | "contract";
}

function renderNavIcon(key: NavRouteItem["key"], size = 19) {
  switch (key) {
    case "today":
      return <TodayIcon size={size} />;
    case "calendar":
      return <CalendarIcon size={size} />;
    case "settings":
      return <SettingsIcon size={size} />;
  }
}

function shouldShowBottomNav(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/settings")
  );
}

function getActiveIndex(pathname: string): number {
  if (pathname === "/") return 0;
  const idx = NAV_ROUTES.findIndex(
    (item) => item.href !== "/" && pathname.startsWith(item.href),
  );
  return idx === -1 ? 0 : idx;
}

const SLOT_PERCENT = 100 / NAV_ROUTES.length;

/**
 * Persistent mobile floating glass-pill bottom navigation styled after P-090:
 * Mounted in AppProvider so route changes never unmount the bar mid-transition.
 */
export function SnakeBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const isVisible = shouldShowBottomNav(pathname);
  const routeIndex = getActiveIndex(pathname);

  const [pill, setPill] = useState<SnakePillState>({
    leftPct: routeIndex * SLOT_PERCENT,
    widthPct: SLOT_PERCENT,
    phase: "idle",
  });

  const prevIndexRef = useRef<number>(routeIndex);

  useEffect(() => {
    if (!isVisible) return;
    NAV_ROUTES.forEach((item) => {
      try {
        router.prefetch(item.href);
      } catch {
        // ignore prefetch errors
      }
    });
  }, [isVisible, router]);

  useEffect(() => {
    if (!isVisible) {
      prevIndexRef.current = routeIndex;
      return;
    }

    const prevIdx = prevIndexRef.current;
    if (prevIdx === routeIndex) {
      const syncRaf = window.requestAnimationFrame(() => {
        setPill({
          leftPct: routeIndex * SLOT_PERCENT,
          widthPct: SLOT_PERCENT,
          phase: "idle",
        });
      });
      return () => window.cancelAnimationFrame(syncRaf);
    }

    prevIndexRef.current = routeIndex;

    const reducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      const reducedRaf = window.requestAnimationFrame(() => {
        setPill({
          leftPct: routeIndex * SLOT_PERCENT,
          widthPct: SLOT_PERCENT,
          phase: "idle",
        });
      });
      return () => window.cancelAnimationFrame(reducedRaf);
    }

    const startIdx = Math.min(prevIdx, routeIndex);
    const span = Math.abs(routeIndex - prevIdx) + 1;

    let contractTimer: ReturnType<typeof setTimeout> | null = null;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const raf = window.requestAnimationFrame(() => {
      setPill({
        leftPct: startIdx * SLOT_PERCENT,
        widthPct: span * SLOT_PERCENT,
        phase: "stretch",
      });

      contractTimer = setTimeout(() => {
        setPill({
          leftPct: routeIndex * SLOT_PERCENT,
          widthPct: SLOT_PERCENT,
          phase: "contract",
        });

        idleTimer = setTimeout(() => {
          setPill((prev) =>
            prev.phase === "idle" ? prev : { ...prev, phase: "idle" },
          );
        }, 230);
      }, 110);
    });

    return () => {
      window.cancelAnimationFrame(raf);
      if (contractTimer) clearTimeout(contractTimer);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [routeIndex, isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed bottom-0 left-0 right-0 w-full max-w-full overflow-visible z-40 md:hidden pointer-events-none px-4 pt-3 pb-[max(0.625rem,env(safe-area-inset-bottom,0px))] flex justify-center items-end"
    >
      <div className="pointer-events-auto w-full max-w-[348px] mx-auto glass-pill rounded-full min-h-[56px] p-1 shadow-[0_14px_34px_-10px_rgba(23,23,25,0.2)] border border-white/80 touch-manipulation">
        <div className="relative flex items-stretch justify-between w-full min-h-[46px]">
          {/* Elastic Snake Indicator */}
          <div
            aria-hidden="true"
            style={{
              left: `${pill.leftPct}%`,
              width: `${pill.widthPct}%`,
              transitionProperty: "left, width",
              transitionTimingFunction:
                pill.phase === "stretch"
                  ? "cubic-bezier(0.2, 0.9, 0.3, 1)"
                  : "cubic-bezier(0.34, 1.35, 0.64, 1)",
              transitionDuration:
                pill.phase === "stretch"
                  ? "110ms"
                  : pill.phase === "contract"
                    ? "220ms"
                    : "0ms",
              willChange: "left, width",
            }}
            className="absolute inset-y-0 rounded-full bg-gradient-to-br from-[#171719] via-[#261E31] to-[#4A3562] shadow-[0_8px_20px_-4px_rgba(92,67,117,0.48)] pointer-events-none z-0"
          />

          {NAV_ROUTES.map((item, idx) => {
            const isActive = idx === routeIndex;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-full transition-colors duration-200 relative z-10 no-underline select-none min-w-[56px] min-h-[40px] active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
                  isActive
                    ? "text-white font-semibold"
                    : "text-text-secondary hover:text-text-primary font-medium",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "transition-transform duration-200 inline-flex items-center justify-center",
                    isActive ? "scale-105 text-blush" : "text-text-secondary",
                  )}
                >
                  {renderNavIcon(item.key, 17)}
                </span>
                <span className="text-[10px] tracking-tight leading-none whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
