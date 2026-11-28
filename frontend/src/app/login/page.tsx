import type { Metadata } from "next";
import { LoginView } from "@/components/pages/login-view";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description:
    "Đăng nhập mẫu cho Học viên (mã học viên), Mentor / Lab Coach và Admin trên ViUnify.",
};

export default function LoginPage() {
  return <LoginView />;
}
