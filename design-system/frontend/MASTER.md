# Hệ thống thiết kế — Unify (Ivory–Pink–Lilac Editorial)

> **Phạm vi:** Tài liệu chuẩn thị giác và quy ước nền tảng cho ứng dụng web/PWA **Unify** — ứng dụng tổng hợp lịch học từ **Outlook**, **Phoenix** và nguồn **`.ics`**.
> **Tham chiếu màu sắc, badge & bottom-bar:** Đồng bộ bảng màu V5 Ivory–Pink–Lilac Editorial, semantic badges và floating glass-pill bottom bar từ `P-090`.

---

## 1. Tổng quan & triết lý thị giác

**Unify** sử dụng bảng màu sáng tinh gọn trên nền ngà ấm (`#FFF9F4`) điểm ánh pastel hồng–tử đinh hương–đào, kết hợp chữ mực đậm `#171719` có độ tương phản cao, thẻ trắng ấm `#FFFEFC` viền mảnh `#E3DAE0`, bóng đổ mềm và khoảng thở thoáng. Giao diện ưu tiên khả năng quét nhanh lịch học hằng ngày trên điện thoại (`375px–430px`), đồng thời mở rộng mạch lạc sang tablet (`768px`) và desktop (`1024px–1440px`).

- **Phong cách cốt lõi:** Ivory–Pink–Lilac Editorial (nền ngà `#FFF9F4`, bề mặt `#FFFEFC`, viền mảnh `#E3DAE0`, CTA mực đậm `#171719`, điểm nhấn tím tử đinh hương `#5C4375` & nền tím nhạt `#E8DCFF`, hồng phấn `#F5D5E8`).
- **Ngôn ngữ & giọng điệu:** 100% tiếng Việt, viết theo **sentence case** (không viết hoa toàn bộ chữ cái cho tiêu đề, nhãn hoặc nút), rõ ràng và trung thực về dữ liệu mẫu.
- **Quy tắc cấm (Anti-patterns):**
  - Không dùng emoji thay cho icon điều hướng hoặc trạng thái.
  - Không dùng màu neon gắt hoặc nền tối toàn trang.
  - Không để lộ toàn bộ URL/token `.ics` riêng tư ở màn hình danh sách nguồn.

---

## 2. Đối chiếu với skill `ui-ux-pro-max`

Trong quá trình khởi tạo bằng `ui-ux-pro-max`, một số gợi ý mặc định của skill khác với chuẩn thị giác của dự án. Tài liệu này thống nhất quy tắc áp dụng như sau:

| Hạng mục | Gợi ý mặc định của skill | Quyết định áp dụng cho Unify |
|---|---|---|
| Bảng màu | Teal `#0D9488`, Accent Orange `#EA580C`, nền `#F0FDFA` | **Giữ chuẩn Stitch & ảnh tham chiếu:** nền kem `#F7F3EE`, nâu đất `#946449`, olive `#9BAC70`, sage `#E6EBD9` |
| Typography | `Plus Jakarta Sans` | **Giữ chuẩn dự án:** `Be Vietnam Pro` (hỗ trợ dấu tiếng Việt rõ nét) + `tabular-nums` cho giờ học |
| Độ sâu bề mặt | Flat Design không bóng đổ | **Giữ chuẩn tham chiếu:** thẻ trắng có viền `#E6DED5` và bóng nhẹ `0 2px 10px rgba(53,42,37,0.04)` |
| UX, A11y & Next.js | Focus ring, WCAG AA >= 4.5:1, `aria-hidden`, Server Components mặc định, Tailwind v4 `@theme` | **Áp dụng đầy đủ** để bảo đảm khả năng đọc, điều hướng bàn phím và hiệu năng |

---

## 3. Token màu sắc & độ tương phản (WCAG AA)

Toàn bộ token màu được khai báo tại `frontend/src/app/globals.css` (`:root` + `@theme inline`) và đồng bộ kiểu dữ liệu tại `frontend/src/lib/tokens.ts`.

| Token CSS | Giá trị Hex | Vai trò sử dụng | Tỷ lệ tương phản |
|---|---|---|---|
| `--background` | `#FFF9F4` | Nền ngà ấm chủ đạo kết hợp radial pastel | Nền cơ sở |
| `--surface` | `#FFFEFC` | Thẻ nội dung, sheet, dialog, thanh chọn | Tách lớp nhẹ trên `#FFF9F4` |
| `--surface-subtle` | `#FAF3ED` | Thẻ thông báo nhẹ, hover nhẹ | Nền phụ |
| `--surface-high` | `#EDE3DA` | Nền badge trung tính, bề mặt nhấn nhẹ | `#4C464F` trên `#EDE3DA` đạt AA |
| `--primary` | `#171719` | CTA chính dạng viên thuốc, badge Workshop | `#FFFFFF` trên `#171719` = **17.8:1** (Đạt AAA) |
| `--primary-pressed` | `#26252B` | Trạng thái hover / active của nút chính | `#FFFFFF` trên `#26252B` = **15.0:1** (Đạt AAA) |
| `--primary-container` | `#F4EEFF` | Nền nhấn tử đinh hương dịu (avatar, container) | `#2B1D3D` trên `#F4EEFF` = **13.0:1** |
| `--on-primary-container` | `#2B1D3D` | Chữ trên `--primary-container` | — |
| `--secondary` / `--olive` | `#5C4375` | Viền ngày đang chọn, điểm nhấn điều hướng, focus ring | `#FFFFFF` trên `#5C4375` = **8.8:1** |
| `--sage-background` | `#E8DCFF` | Nền ngày đang chọn, tab bật, badge Buổi học | `#1F172B` trên `#E8DCFF` = **12.8:1** |
| `--on-sage` | `#1F172B` | Chữ trên `--sage-background` | — |
| `--blush` | `#F5D5E8` | Điểm sáng icon active trên bottom bar | Chỉ dùng làm điểm nhấn trên nền tối `#171719` |
| `--text-primary` | `#171719` | Tiêu đề, nội dung chính, giờ học | Trên `#FFFEFC` = **17.6:1** |
| `--text-secondary` | `#6F6870` | Chú thích, phụ đề, trạng thái phụ | Trên `#FFF9F4` = **5.2:1** (Đạt AA >= 4.5:1) |
| `--border` | `#E3DAE0` | Viền thẻ, viền ô nhập, vạch timeline, divider | Viền nhẹ phân tách bề mặt |
| `--warning-background` | `#FFEDD5` | Banner đổi lịch | `#7C2D12` trên `#FFEDD5` = **8.7:1** |
| `--on-warning` | `#7C2D12` | Chữ trên `--warning-background` | — |
| `--danger` | `#BA1A1A` | CTA hủy/tạo lại liên kết, viền input lỗi | `#FFFFFF` trên `#BA1A1A` = **6.4:1** |
| `--danger-pressed` | `#93000A` | Hover/active của nút danger | `#FFFFFF` trên `#93000A` = **9.3:1** |
| `--danger-background` | `#FFDAD6` | Nền banner lỗi đồng bộ, nền ô input không hợp lệ | `#93000A` trên `#FFDAD6` = **8.3:1** |
| `--on-danger-background` | `#93000A` | Chữ lỗi trên `--danger-background` | — |

> **Semantic Badges (P-090):** Các badge trạng thái dùng cặp pill nền nhạt + chữ đậm Tailwind chuẩn tương phản cao (`success`: `bg-emerald-100 text-emerald-800`, `warning`: `bg-amber-100 text-amber-800`, `danger`: `bg-rose-100 text-rose-800`, `info`: `bg-sky-100 text-sky-800`, `secondary`: `bg-[#E8DCFF] text-[#1F172B]`, `primary`: `bg-[#171719] text-white`).

---

## 4. Typography (`Be Vietnam Pro`)

- **Font chính:** `Be Vietnam Pro` qua `next/font/google` (`subsets: ["latin", "vietnamese"]`, weights `400`, `500`, `600`, `700`).
- **Số thẳng hàng:** Mọi giờ học, khoảng thời gian, ngày tháng và bộ đếm luôn dùng `font-variant-numeric: tabular-nums` (class `tabular-nums`).
- **Chữ hoa/thường:** Luôn dùng sentence case; không `text-transform: uppercase`.

| Token | Kích thước / Line-height | Trọng lượng | Letter-spacing | Công dụng |
|---|---|---|---|---|
| `display-lg` | `28px / 36px` | `600` (SemiBold) | `-0.3px` | Lời chào màn hình Hôm nay (*Chào Quang*) |
| `headline-lg` | `22px / 30px` | `600` (SemiBold) | `-0.2px` | Tiêu đề trang, tiêu đề trong Sheet chi tiết |
| `headline-md` | `18px / 26px` | `600` (SemiBold) | `-0.1px` | Tiêu đề thẻ nổi bật, tiêu đề Dialog |
| `title-md` | `16px / 24px` | `600` (SemiBold) | `0px` | Tiêu đề mục, tên sự kiện trên EventCard, số ngày |
| `body-lg` | `16px / 24px` | `400` (Regular) | `0px` | Đoạn văn quan trọng |
| `body-md` | `15px / 22px` | `400` (Regular) | `0px` | Nội dung mô tả, ô nhập liệu |
| `body-sm` | `13px / 20px` | `400` (Regular) | `0px` | Giờ phụ, tên nguồn, helper text, thông báo lỗi |
| `label-lg` | `15px / 20px` | `500` (Medium) | `0px` | Nhãn nút bấm chính (`min-h-[48px]`) |
| `label-md` | `13px / 18px` | `500` (Medium) | `0px` | Nhãn tab, nút phụ, label input, toast |
| `label-sm` | `12px / 16px` | `500` (Medium) | `0px` | Nhãn badge, thứ trong tuần (`T2..CN`), nav bottom |

---

## 5. Spacing, Radius, Shadow & Motion

### Thang Spacing (bội số `4px`)
- `--space-xs`: `4px` — khoảng cách icon và chữ trong badge/nav
- `--space-sm`: `8px` — khoảng cách giữa các badge hoặc nút cạnh nhau
- `--space-md`: `12px` — khoảng cách giữa giờ và thẻ trên timeline, gap nội bộ nhỏ
- `--space-lg`: `16px` — padding thẻ vừa (`p-4`), khoảng cách giữa các thẻ
- `--space-page-margin`: `20px` — lề ngang trang trên mobile (`375px–430px`)
- `--space-xl`: `24px` — padding thẻ nổi bật / sheet / dialog (`p-6`), khoảng cách giữa các section
- `--space-2xl`: `32px` — khoảng cách giữa các nhóm lớn trên tablet/desktop

### Thang Border Radius
- `--radius-sm`: `8px` — thành phần phụ rất nhỏ
- `--radius-default`: `14px` — bề mặt phụ
- `--radius-md`: `16px` — `Input`, khung icon nguồn lịch
- `--radius-lg`: `20px` — `EventCard` timeline, banner cảnh báo/lỗi
- `--radius-xl`: `24px` — `EventCard` nổi bật, `Dialog`, `Sheet` (`rounded-t-[24px]` trên mobile)
- `--radius-full`: `9999px` — `Button`, `IconButton`, `Badge`, `DateStrip` pill, `Tabs` pill, `Toast`

### Shadow (Bóng mềm hiện đại)
- `--shadow-card-sm`: `0 4px 12px -2px rgba(23, 23, 25, 0.05), 0 2px 6px -1px rgba(23, 23, 25, 0.03)` — thẻ sự kiện, thẻ nguồn lịch
- `--shadow-card`: `0 10px 24px -4px rgba(23, 23, 25, 0.06), 0 4px 10px -2px rgba(23, 23, 25, 0.03)` — thẻ nổi bật, header showcase
- `--shadow-overlay`: `0 16px 32px -6px rgba(23, 23, 25, 0.14), 0 6px 14px -3px rgba(23, 23, 25, 0.05)` — `Dialog`, `Sheet`
- `--shadow-toast`: `0 12px 28px -4px rgba(23, 23, 25, 0.22)` — `Toast`
- `.glass-pill` + Floating Snake Bottom Bar: pill mờ nổi góc bo tròn hoàn toàn `rounded-full` cùng chỉ báo snake gradient tối `#171719 -> #261E31 -> #4A3562`.

### Motion
- `--duration-state-change`: `180ms` (`ease-out`) — hover, active, chuyển chọn ngày/tab
- `--duration-surface-enter`: `240ms` (`cubic-bezier(0.2, 0, 0, 1)`) — mở Sheet / Dialog / Toast
- `--duration-surface-exit`: `180ms` (`cubic-bezier(0.3, 0, 1, 1)`) — đóng bề mặt phủ
- Luôn tôn trọng `@media (prefers-reduced-motion: reduce)` để tắt animation/transition cho người dùng nhạy cảm chuyển động.

---

## 6. Responsive & Chuẩn bị cho PWA

- **Breakpoints:**
  - **Mobile (`375px–639px`):** Layout 1 cột, lề `20px`, bottom sheet bám đáy (`rounded-t-[24px]`), tôn trọng `env(safe-area-inset-bottom)`.
  - **Tablet (`768px–1023px`):** Lưới 2 cột cho danh sách thẻ / showcase, sheet và dialog căn giữa.
  - **Desktop (`1024px–1440px`):** Khung tối đa `max-w-6xl` (`1152px`), chia 2–3 cột thoáng, giữ độ rộng dòng đọc văn bản (`max-w-prose`).
- **Vùng chạm (Touch Target):** Mọi nút bấm, `IconButton`, ô ngày `DateStrip` và item điều hướng có kích thước tối thiểu `44×44px` (`min-h-[44px] min-w-[44px]`); CTA chính đạt `48px` (`min-h-[48px]`).
- **PWA Readiness:** Token không phụ thuộc hiệu ứng nặng, nền `#F7F3EE` thân thiện khi cài đặt standalone, sử dụng `viewport` chuẩn và khoảng đệm safe-area sẵn sàng cho bước cấu hình `manifest` và service worker ở giai đoạn sau.

---

## 7. Danh mục 11 Component nền tảng & Accessibility

Tất cả component đặt tại `frontend/src/components/ui/`:

1. **`Button`**: 5 biến thể (`primary`, `secondary`, `outline`, `ghost`, `danger`), 3 kích thước (`sm`, `md`, `lg`), trạng thái `loading` (`aria-busy="true"`), `disabled`, `leftIcon`/`rightIcon`.
2. **`IconButton`**: Nút tròn tối thiểu `44×44px`, bắt buộc `aria-label`, hỗ trợ chấm thông báo `hasDot` và `pressed` (`aria-pressed`).
3. **`Input`**: Nhãn liên kết `htmlFor`, `leftIcon`, `rightSlot`, `helperText`, trạng thái lỗi (`aria-invalid="true"`, `aria-describedby`), `tabularNums`.
4. **`Badge`**: Nhãn trạng thái bo tròn `rounded-full whitespace-nowrap` với biến thể `neutral`, `sage`, `primary`, `warning`, `danger`, `outline`, hỗ trợ chấm trạng thái hoặc icon `aria-hidden="true"`.
5. **`EventCard`**: 3 biến thể (`featured`, `timeline`, `compact`), hiển thị loại sự kiện, cảnh báo đổi giờ/lệch thông tin (`Thông tin chưa khớp`), giờ `tabular-nums`, nguồn gộp (`Outlook`, `Phoenix`, `.ics`), hỗ trợ nhấn và kích hoạt bằng bàn phím.
6. **`DateStrip`**: Thanh 7 ngày (`T2–CN`) dạng viên thuốc đứng, phân biệt rõ `isToday` (viền nâu đất `#946449`), `selected` (nền sage `#E6EBD9` + viền olive `#9BAC70` + chấm olive), hỗ trợ phím mũi tên Trái/Phải.
7. **`Tabs`**: Segmented pill control với `role="tablist"`, `role="tab"`, `aria-selected`, điều hướng phím mũi tên / `Home` / `End`.
8. **`Dialog`**: Hộp xác nhận trung tâm (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`), đóng bằng `Escape` hoặc click nền mờ, khóa cuộn nền và khôi phục focus khi đóng.
9. **`Sheet`**: Bottom sheet trên mobile (`rounded-t-[24px]`, thanh nắm trên đỉnh, đệm safe-area) và modal căn giữa trên `md+`, đóng bằng `Escape` hoặc backdrop, khôi phục focus.
10. **`Toast`**: Thông báo viên thuốc `role="status"` + `aria-live="polite"` + `aria-atomic="true"`, tự đóng sau `3500ms` (có nút đóng thủ công) và có biến thể inline để xem trước trên `/design-system`.
11. **`Skeleton`**: Khối tải màu kem/viền nhẹ (`animate-pulse`, tự tắt khi `prefers-reduced-motion: reduce`, `aria-hidden="true"`), kèm mẫu `EventCardSkeleton` và `SourceCardSkeleton`.

### Checklist Accessibility trước khi bàn giao
- [x] Không dùng emoji làm icon; mọi icon đều là SVG vector đồng nhất nét `1.75px`, bo tròn đầu nét.
- [x] Icon trang trí cạnh chữ có `aria-hidden="true"`; mọi `IconButton` bắt buộc có `aria-label`.
- [x] Vòng focus `focus-visible:ring-2 focus-visible:ring-primary` hiển thị rõ trên mọi nút, tab, ô ngày, input và nút đóng modal.
- [x] `scroll-padding-top: 80px` tránh header sticky che mất phần tử đang focus.
- [x] Tương phản chữ/nền đạt WCAG AA >= 4.5:1.
- [x] Hỗ trợ `prefers-reduced-motion: reduce`.
