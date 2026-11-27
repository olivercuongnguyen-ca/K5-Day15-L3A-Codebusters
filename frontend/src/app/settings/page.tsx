import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { SettingsView } from "@/components/pages/settings-view";

export const metadata: Metadata = {
  title: "Cài đặt",
  description:
    "Quản lý hồ sơ, tùy chọn hiển thị lịch và hướng dẫn thêm lịch vào Google Calendar.",
};

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsView />
    </AppShell>
  );
}
