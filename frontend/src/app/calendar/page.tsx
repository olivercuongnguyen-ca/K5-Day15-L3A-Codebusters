import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { CalendarView } from "@/components/pages/calendar-view";

export const metadata: Metadata = {
  title: "Lịch",
  description:
    "Xem lịch học hợp nhất theo tuần và tháng, lọc theo buổi học, coaching, trực hỗ trợ và hạn nộp.",
};

export default function CalendarPage() {
  return (
    <AppShell>
      <CalendarView />
    </AppShell>
  );
}
