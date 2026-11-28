# Dàn slide → lấy số từ file nào

> Làm ở guide bước 5.1. Luật: **không có bằng chứng thì không có slide** — mỗi trang ≥1 con số / trích dẫn có nguồn / kết quả đo.
> Xuất PDF thành `demo-slides.pdf` ở thư mục gốc repo (và `slides/demo-slides.pdf`), nộp tại CP4 14:30 Thứ Bảy 28/11. Nộp PDF, không nộp link.

| # | Trang | Có gì | Số lấy từ | Xong |
|---|---|---|---|---|
| 1 | Người dùng & pain | Học viên AI20K (L3A/L3B) · `N = 1,083` (100% qua ≥2 tòa nhà, trung vị 7 phòng/4 tuần) · Khảo sát `n = 21` (90.5% từng nhầm/lỡ lịch) + trích dẫn `S07`, `S02` | `evidence/summary.md` | ☑ |
| 2 | Vì sao chọn bài này | Impact **~64,980 phút/tháng** (~60 phút/người/tháng) · Loại hướng Microsoft Graph & scrape Discord (không kịp + rủi ro bảo mật) | `spec.md` §2 | ☑ |
| 3 | Giải pháp | Lát cắt 1 câu · Workflow cố định (rule-based gộp/lọc lịch + 1 bước AI soạn email xin nghỉ học) · G9, G10, G11 & guard `_facts_ok()` | `spec.md` §4 | ☑ |
| 4 | Demo live | 1 trường hợp `thuong` (`B14`: `LAB 14`, giấy khám bệnh → `ready`) + 1 trường hợp `kho`/`tu_choi` (`B13` thiếu minh chứng / `B20` prompt injection) + video dự phòng | `eval/benchmark.csv` | ☑ |
| 5 | **Đánh giá thế nào** | 20 câu thử (`12/20` từ người dùng) · 4 metric · Lượt 1 `15/20 (75%)` [`run-1@20261128-095441`] → Lượt 2 `19/20 (95%)` [`run-2@20261128-104257`] — Đạt chuẩn | `eval/README.md`, `eval/report.md` | ☑ |
| 6 | **Chi phí khi dùng thật** | `$0.000051/task` (`openai/gpt-4o-mini`, ≈ 1 ₫) · 3 kịch bản (300 / 700 / 1,083 người) · cơ sở `$0.9626/tháng` (**35 ₫/người/tháng** vs tiết kiệm 60 phút/tháng) | `cost/cost-estimate.md` | ☑ |
| 7 | Kết luận | **GO** — dẫn lại `90.5%` pain (Trang 1), `95%` đạt chuẩn (Trang 5), `35 ₫/người/tháng` (Trang 6) | — | ☑ |
| 8 | Nếu có thêm 1 tuần | Unit test & chạy Lượt 3 nhánh `duty_changes`, đồng bộ Postgres toàn lớp, và test chéo người dùng thật (`validation/log.md`) | `eval/report.md` mục 4 · `validation/log.md` | ☑ |

**Trước khi lên:** tải repo về một máy khác (hoặc thư mục mới), chạy theo mục "Chạy trong 3 phút" của `README.md` · `.env` có trên máy demo, đã gọi thử 1 câu trong vòng 1 giờ trước giờ demo · video dự phòng mở được bằng cửa sổ ẩn danh · biết bản chạy thử sẽ làm gì với **1 câu thử lạ** của giám khảo.

Ai nói trang nào *(gợi ý phân công theo vai trò trong `TEAMS.md`, mỗi người ≥1 phần — nhóm có thể điều chỉnh lại trước khi lên trình bày)*:

| Trang | Người nói |
|---|---|
| Trang 1 (Người dùng & pain), Trang 2 (Impact), Trang 7 (Kết luận) | Đinh Trần Nguyên *(Docs, Pitcher)* |
| Trang 3 (Giải pháp AI), Trang 4 (Demo live) | Nguyễn Hoàng Cương *(Backend, Techlead)* |
| Trang 5 (Đánh giá Lượt 1 → Lượt 2) | Bùi Đăng Quang *(Frontend, Devops)* |
| Trang 6 (Chi phí khi dùng thật), Trang 8 (Nếu có thêm 1 tuần) | Thân Đức Trung *(Feature Dev, Devops)* |
