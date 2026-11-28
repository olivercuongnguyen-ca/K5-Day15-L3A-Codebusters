import type { Metadata } from "next";
import { DesignSystemShowcase } from "@/components/design-system/design-system-showcase";

export const metadata: Metadata = {
  title: "Hệ thống thiết kế",
  description:
    "Xem bảng màu, typography Be Vietnam Pro, spacing, token và các component nền tảng của Unify.",
};

export default function DesignSystemPage() {
  return <DesignSystemShowcase />;
}
