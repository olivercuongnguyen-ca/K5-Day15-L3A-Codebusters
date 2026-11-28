# Báo cáo đánh giá — lượt 1 → một cải tiến → lượt 2

> Điền ở guide bước 4.1. Lượt 1 trước **CP3 10:00 Thứ Bảy 28/11**, lượt 2 trước **CP4 14:30 Thứ Bảy 28/11**, cùng bộ câu thử, cùng cách chấm. Chấm ở rubric R5.

## 1. Kết quả

| Lượt | Run ID | Đạt / tổng | % | thuong | kho | tu_choi | So với chuẩn "đạt" |
|---|---|---|---|---|---|---|---|
| 1 | `run-1@20261128-095441` | 15/20 | 75% | 5/10 | 6/6 | 4/4 | Chưa đạt (thiếu ở nhóm `thuong`, ngưỡng ≥ 90%) |
| 2 | `run-2@20261128-104257` | 19/20 | 95% | 9/10 | 6/6 | 4/4 | **Đạt chuẩn** (≥ 90% tổng, ≥ 90% `thuong`, ≥ 80% `kho`, 100% `tu_choi`) |

Kết quả từng câu: `eval/run-1.csv`, `eval/run-2.csv`. Trace: `traces/run-1.jsonl`, `traces/run-2.jsonl`.

## 2. Lỗi lượt 1 — gom thành nhóm có tên

| Nhóm lỗi | Số câu | Câu |
|---|---|---|
| Lọc sai phạm vi / nhầm bảng dữ liệu ở nhánh rule-based | 4 | `B02`, `B15`, `B16`, `B17` |
| Model hỏi lại quá khắt khe với lý do gia đình hợp lệ | 1 | `B13` |

**≥3 lỗi cụ thể:**

| Câu | Input | Output | Vì sao sai |
|---|---|---|---|
| `B02` | `{"action": "filter_schedule", "team": "AIP-08", "range": "next_week"}` | `{"status": "ready", "sessions": ["LAB 14", "LEC 15"], ...}` | Chưa lọc theo `team` và `range`, trả về toàn bộ buổi học của lớp L3A thay vì chỉ lọc đúng team AIP-08. |
| `B13` | `{"student_id": "2A202600001", "session": "LEC 15", "reason": "Bận việc gia đình đột xuất", ...}` | `{"status": "need_info", "question": "Em có thể cho biết rõ hơn về việc bận không?"}` | Model áp dụng tiêu chí mơ hồ quá chặt với lý do việc gia đình phổ thông, bắt người dùng nhập lại thay vì soạn bản nháp ngay. |
| `B16` | `{"action": "filter_schedule", "event_types": ["workshop", "office_hour"], ...}` | `{"status": "ready", "sessions": ["Nhóm 7", "Nhóm 7", "Nhóm 7"], ...}` | Lọc dính cả sự kiện loại `duty` (`Nhóm 7` Mentor duty) thay vì chỉ giữ `workshop`/`office_hour`. |
| `B17` | `{"action": "detect_changes", "event_type": "mentor_duty", "range": "next_week"}` | `{"based_on": ["L3A-00: None -> H201", "L3A-01: None -> H209"]}` | Đọc nhầm bảng `room_changes` của buổi học thay vì bảng `duty_changes` của Mentor duty. |

## 3. Một lần cải tiến

- **Nhắm vào nhóm lỗi:** Lọc sai phạm vi/bảng dữ liệu ở nhánh rule-based (`B02`, `B15`, `B16`, `B17`) và tiêu chí hỏi lại quá chặt ở nhánh AI soạn mail (`B13`) — đây là nhóm lỗi **đau nhất với người dùng** vì trả nhầm lịch của nhóm khác hoặc làm học viên mất thời gian nhập lại khi đã nêu lý do xin nghỉ hợp lệ.
- **Đã sửa gì:**
  1. Cập nhật `_handle_schedule_action` trong `codebase/agent.py` để lọc đúng theo `team`, `range` (`tomorrow`), loại trừ `category == "duty"` khi lọc `workshop`/`office_hour`, và trỏ `mentor_duty` sang bảng `duty_changes`.
  2. Bổ sung quy tắc rõ ràng trong `SYSTEM` prompt của `codebase/agent.py`: chấp nhận soạn bản nháp ngay (`status: "ready"`) với lý do gia đình/cá nhân đột xuất rõ ràng.
- **Kết quả:** Nhóm `thuong` tăng từ **5/10 (50%) → 9/10 (90%)** · Tổng **75% → 95% (19/20)**, chính thức vượt chuẩn "đạt" đã chốt.
- **Câu nào tệ đi sau khi sửa:** Không có câu nào bị tệ đi (`kho` giữ nguyên 6/6, `tu_choi` giữ nguyên 4/4). Tuy nhiên, `B17` ở lượt 2 gặp 1 lỗi kỹ thuật SQL (`OperationalError: no such column: title` do bảng `duty_changes` dùng cột `note` thay vì `title`) nên bị chấm `0`.

## 4. Còn lại

- **Lỗi chưa sửa + nguy hiểm thế nào:** Lỗi SQL `no such column: title` ở `B17` trong lượt 2 (`run-2.csv`) đã được phát hiện và sửa ngay trong `codebase/agent.py` (đổi sang cột `note`), chưa chạy thành lượt 3. Nếu chưa sửa khi demo trực tiếp tính năng kiểm tra đổi lịch Mentor duty, nhánh `mentor_duty` sẽ báo lỗi truy vấn.
- **Nếu có thêm 1 tuần:** Bổ sung bộ unit test riêng cho mọi nhánh `_handle_schedule_action`, đồng bộ trực tiếp dữ liệu thật từ Neon Postgres cho toàn bộ kịch bản lọc lịch, và thêm bước người dùng thử (`validation/log.md`).
