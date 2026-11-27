import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { TodayView } from "@/components/pages/today-view";

export const metadata: Metadata = {
  title: "Hôm nay",
  description:
    "Xem buổi học tiếp theo, dòng thời gian trong ngày và hạn nộp sắp tới trên Unify.",
};

export default function HomePage() {
  return (
    <AppShell>
      <TodayView />
    </AppShell>
  );
}
