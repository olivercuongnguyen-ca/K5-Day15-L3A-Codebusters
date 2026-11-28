# Chi phí khi dùng thật

> Điền ở guide bước 4.2, nộp ở CP4 14:30 Thứ Bảy 28/11. Chấm ở rubric R6.

## 1. Đầu vào

- **Persona** (`cost/personas.yaml`): 3 kiểu (`dung_it` 10% · `dung_vua` 29% · `dung_nhieu` 61%). Nguồn: khảo sát thực tế `n = 21` (`evidence/survey/results.csv`, câu D về tần suất kiểm tra lịch); số phiên & số lượt/phiên được *(tự ước tính)* từ tần suất sử dụng.
- **Số người dùng thật** 3 kịch bản: thấp **300** *(tự ước tính)* · cơ sở **700** *(quy mô lớp L3 theo README hackathon)* · cao **1,083** *(toàn khóa AI20K từ `scripts/mine_room_changes.py`)*.
- **Giá** ≥2 mức model (xem ngày 28/11/2026):
  - `openai/gpt-4o-mini`: `$0.15` input / `$0.60` output cho 1M token ([OpenAI Pricing](https://openai.com/api/pricing/))
  - `google/gemini-2.5-flash`: `$0.30` input / `$2.50` output cho 1M token ([Google AI Pricing](https://ai.google.dev/gemini-api/docs/pricing))
- **Tỉ lệ đạt** dùng để tính: **19/20 (95%)** — lượt `run-2@20261128-104257` (lượt 2).
- **Đo token trên model `openai/gpt-4o-mini`**, tính giá tham chiếu cho `openai/gpt-4o-mini` và `google/gemini-2.5-flash` (tỷ giá tham khảo: `1 USD = 25.400 ₫`, *tự ước tính 28/11/2026*).

## 2. Kết quả mô phỏng

Lượt mô phỏng: `cost/simulate-1.csv` · 50 phiên · seed `42` · lỗi: `0/50` (`cost/simulate-1-summary.md`).

| Model | Chi phí / phiên | Chi phí / task thành công | / tháng — thấp (300) | / tháng — cơ sở (700) | / tháng — cao (1.083) | / người / tháng (cơ sở) |
|---|---|---|---|---|---|---|
| `openai/gpt-4o-mini` | $0.000048 (≈ 1 ₫) | $0.000051 (≈ 1 ₫) | $0.4125 (≈ 10.478 ₫) | $0.9626 (≈ 24.449 ₫) | $1.49 (≈ 37.826 ₫) | $0.0014 (≈ 35 ₫) |
| `google/gemini-2.5-flash` | $0.00014 (≈ 4 ₫) | $0.00015 (≈ 4 ₫) | $1.22 (≈ 30.868 ₫) | $2.84 (≈ 72.026 ₫) | $4.39 (≈ 111.434 ₫) | $0.0041 (≈ 103 ₫) |

Chi phí / task thành công = chi phí trung bình mỗi phiên ÷ tỉ lệ đạt (`95%`). Nhờ kiến trúc **rule-based xử lý phần lớn tác vụ lịch (0 token)** và chỉ gọi AI 1 bước cho phần soạn email xin nghỉ, chi phí thực tế cực thấp.

## 3. So với impact

- **Impact / người / tháng (`spec.md` §2):** Tiết kiệm ~**60 phút/người/tháng** (15 phút/tuần × 4 tuần, khảo sát `n = 21`) và giảm rủi ro nhầm giờ/phòng (90.5% từng nhầm/lỡ lịch).
- **Chi phí / người / tháng (cơ sở, model `openai/gpt-4o-mini`):** **$0.0014 (≈ 35 ₫/người/tháng)** (tổng ~**24.449 ₫/tháng** cho cả 700 học viên).
- **Kết luận một dòng — đáng làm không:** **Rất đáng làm** — chỉ tốn khoảng **35 ₫/người/tháng** (chưa tới 1 USD/tháng cho 700 học viên) để tiết kiệm ~60 phút/người/tháng và loại bỏ lỗi nhầm lịch từ nhiều nguồn.
