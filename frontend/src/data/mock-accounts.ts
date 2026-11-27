export type UserRole = "student" | "mentor" | "admin";

export interface DemoUserAccount {
  id: string;
  role: UserRole;
  roleLabel: string;
  studentCode?: string;
  email: string;
  password?: string;
  name: string;
  shortName: string;
  subtitle: string;
  initials: string;
}

export const MOCK_ACCOUNTS: DemoUserAccount[] = [
  {
    id: "acc-student-1",
    role: "student",
    roleLabel: "Học viên",
    studentCode: "HV202601",
    email: "quang.nguyen@hocvien.edu.vn",
    name: "Quang Nguyễn",
    shortName: "Quang",
    subtitle: "Khóa AI Engineering",
    initials: "QN",
  },
  {
    id: "acc-student-2",
    role: "student",
    roleLabel: "Học viên",
    studentCode: "HV202602",
    email: "minhthu.le@hocvien.edu.vn",
    name: "Lê Minh Thư",
    shortName: "Minh Thư",
    subtitle: "Khóa AI Engineering",
    initials: "MT",
  },
  {
    id: "acc-mentor-1",
    role: "mentor",
    roleLabel: "Mentor",
    email: "quan.mentor@unify.edu.vn",
    password: "mentor123",
    name: "Trần Minh Quân",
    shortName: "Minh Quân",
    subtitle: "Mentor chuyên môn AI Agent",
    initials: "MQ",
  },
  {
    id: "acc-mentor-2",
    role: "mentor",
    roleLabel: "Lab Coach",
    email: "minhanh.coach@unify.edu.vn",
    password: "coach123",
    name: "Nguyễn Minh Anh",
    shortName: "Minh Anh",
    subtitle: "Lab Coach · Hỗ trợ thực hành",
    initials: "MA",
  },
  {
    id: "acc-admin-1",
    role: "admin",
    roleLabel: "Admin",
    email: "admin@unify.edu.vn",
    password: "admin123",
    name: "Quản trị đào tạo",
    shortName: "Quản trị viên",
    subtitle: "Ban điều hành hệ thống Unify",
    initials: "AD",
  },
];

export const DEFAULT_DEMO_USER: DemoUserAccount = MOCK_ACCOUNTS[0];

export function getAccountsByRole(role: UserRole): DemoUserAccount[] {
  return MOCK_ACCOUNTS.filter((account) => account.role === role);
}

export function authenticateStudentCode(rawCode: string): DemoUserAccount | null {
  const normalized = rawCode.trim().toUpperCase();
  if (!normalized) return null;
  return (
    MOCK_ACCOUNTS.find(
      (account) =>
        account.role === "student" &&
        account.studentCode?.toUpperCase() === normalized,
    ) ?? null
  );
}

export function authenticateStaffAccount(
  role: "mentor" | "admin",
  rawEmail: string,
  rawPassword: string,
): DemoUserAccount | null {
  const email = rawEmail.trim().toLowerCase();
  const password = rawPassword;
  if (!email || !password) return null;
  return (
    MOCK_ACCOUNTS.find(
      (account) =>
        account.role === role &&
        account.email.toLowerCase() === email &&
        account.password === password,
    ) ?? null
  );
}
