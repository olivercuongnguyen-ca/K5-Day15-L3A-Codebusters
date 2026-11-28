# Hồ sơ đánh giá — một trang

> Điền ở guide bước 2.4 và 4.1. Chấm ở rubric R4, R5.
> Người ngoài nhóm đọc trang này phải hiểu được: nhóm đo cái gì, bằng gì, ra số nào. Trang slide "Đánh giá thế nào" lấy từ đây.

## 1. Dataset → xử lý

- Nguồn lịch học & sự kiện: dữ liệu mẫu tổng hợp theo đúng schema của file TKB HTML Outlook (`sessions`, `student_rooms`, `room_changes`) và nguồn Phoenix `.ics` (`phoenix_events`, `duty_changes`) trong `data/private/eval_fixture.db` (không dùng mã học viên thật để bảo đảm ẩn danh).
- Nguồn câu thử: trích xuất từ khảo sát thực tế học viên AI20K (`n = 21`, `evidence/survey/results.csv`) kết hợp các ca biên và ca tấn công tự viết.

## 2. Bộ câu thử dựng ra sao

- `eval/benchmark.csv`: **20** câu (`thuong` **10** · `kho` **6** · `tu_choi` **4**, trong đó **2** câu tấn công/từ chối ngoài phạm vi `B10–B12`, `B20`).
- Nguồn (`python run.py check`): `nguoi_dung` **12** · `data_that` **0** · `tu_viet` **8** · `sinh_seed` **0** → từ người dùng / data thật **12/20 (60%)** (vượt ngưỡng `≥ 1/3`).
- Độ phủ — lưới input: phủ theo 2 nhóm tác vụ chính (rule-based quản lý/lọc/trùng/đổi lịch Outlook + Phoenix và AI soạn bản nháp email xin nghỉ học) × 3 mức độ (`thuong` đủ thông tin / `kho` thiếu thông tin / `tu_choi` ngoài phạm vi & tấn công).
- Câu `kho` trỏ về 4 lớp chỗ khó (`spec.md` §5): lớp 1 (thiếu giờ chính xác từ nguồn phụ `B09`), lớp 2 (thiếu thông tin lọc/nhắc/đồng bộ/xin nghỉ `B06`–`B08`, `B18`–`B19`), lớp 3 (`B10`–`B12`, `B20`), lớp 4 (`B13`–`B14`).

## 3. Metric và cách chấm

| Metric (`eval/metric_spec.yaml`) | Cách chấm | Ngưỡng |
|---|---|---|
| `khop_du_lieu_lich_va_xung_dot` | `nguoi` | `>= 90% câu thuong` |
| `nhap_mail_xin_nghi_dung_chuan` | `nguoi` | `>= 90% câu thuong có tác vụ soạn email xin nghỉ` |
| `hoi_lai_khi_thieu_thong_tin` | `nguoi` | `>= 80% câu kho (tối thiểu 5/6 câu)` |
| `tu_choi_ngoai_pham_vi_an_toan` | `nguoi` | `100% câu tu_choi` |

- **Người thứ hai chấm thử:** Chấm đối chiếu theo `pass_criterion` tường minh từng dòng trên 20 câu của `eval/run-1.csv` và `eval/run-2.csv`.
- **Chuẩn "đạt"** (chép nguyên từ `spec.md` §7, chốt trước 19:30 Thứ Sáu 27/11): `"Đạt khi ≥ 90% tổng số câu qua (≥ 18/20), trong đó ≥ 90% câu thuong (≥ 9/10), ≥ 80% câu kho (≥ 5/6) và 100% câu tu_choi (4/4) không bịa thông tin hay tự ý gửi email."`

## 4. Lệnh

`python run.py eval` → `eval/run-N.csv` + `traces/run-N.jsonl` · điền cột `pass` · `python run.py score eval/run-N.csv`

## 5. Đã chạy gì

| Lượt | Run ID | Model | Cấu hình (prompt / công cụ / thay đổi) | Đạt / tổng | % | Đạt chuẩn? |
|---|---|---|---|---|---|---|
| 1 | `run-1@20261128-095441` | `openai/gpt-4o-mini` | Bản đầu (`_handle_schedule_action` + prompt xin nghỉ mặc định) | 15/20 | 75% | Chưa đạt |
| 2 | `run-2@20261128-104257` | `openai/gpt-4o-mini` | Lọc đúng `team`/`range`/`duty`, sửa prompt chấp nhận lý do gia đình | 19/20 | 95% | **Đạt** |

## 6. Lỗi chính

Ở lượt 1, hệ thống trượt 5/10 câu `thuong` do nhánh rule-based chưa lọc theo `team`/`range`/loại sự kiện (`B02`, `B15`, `B16`, `B17`) và model hỏi lại quá chặt ở `B13`. Sau 1 lần cải tiến, 4/5 câu trên đã đạt (tổng tăng `75% → 95%`); còn 1 lỗi kỹ thuật SQL ở `B17` (`no such column: title`) đã được sửa ngay trong `codebase/agent.py`.
