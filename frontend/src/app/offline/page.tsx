import type { Metadata } from "next";
import Link from "next/link";
import { CloudOffIcon, LockIcon } from "@/components/ui";
import { OfflineRetryButton } from "@/components/pwa/offline-retry-button";

export const metadata: Metadata = {
  title: "Ngoại tuyến",
  description:
    "Bạn đang ngoại tuyến. Vui lòng kết nối lại mạng để tiếp tục sử dụng ViUnify.",
};

export default function OfflinePage() {
  return (
    <div className="min-h-dvh bg-background text-text-primary flex items-center justify-center px-5 py-10">
      <main className="w-full max-w-md bg-surface border border-border rounded-[24px] p-6 sm:p-8 shadow-card flex flex-col items-center text-center gap-5">
        <span className="w-14 h-14 rounded-full bg-warning-background text-on-warning inline-flex items-center justify-center">
          <CloudOffIcon size={26} />
        </span>

        <div className="flex flex-col gap-2">
          <h1 className="text-[22px] leading-[30px] font-semibold tracking-[-0.2px] text-text-primary">
            Bạn đang ngoại tuyến
          </h1>
          <p className="text-[15px] leading-[22px] text-text-secondary text-pretty">
            Không thể tải trang mới khi thiết bị chưa có kết nối mạng. Hãy
            kiểm tra Wi-Fi hoặc dữ liệu di động rồi thử lại.
          </p>
        </div>

        <div className="w-full flex items-start gap-2.5 p-3.5 rounded-[16px] bg-surface-subtle border border-border text-left">
          <LockIcon size={18} className="text-primary shrink-0 mt-0.5" />
          <p className="text-[13px] leading-[19px] text-text-secondary">
            Vì lý do bảo mật, email, token xác thực và dữ liệu lịch riêng tư
            không được lưu trong bộ nhớ đệm ngoại tuyến.
          </p>
        </div>

        <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 pt-1">
          <OfflineRetryButton />
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-12 px-5 rounded-full border border-border bg-surface text-[15px] font-medium text-text-primary hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Về trang Hôm nay
          </Link>
        </div>
      </main>
    </div>
  );
}
