# Tổng hợp bằng chứng pain

> Điền ở guide bước 1.2, xong trước **CP3 10:00 Thứ Bảy 28/11**. Chấm ở rubric R1.
> Ba nguồn ngang nhau — tối thiểu **≥1 nguồn đạt ngưỡng**. Mạnh nhất: đào data ra insight → hỏi người dùng để kiểm lại (hoặc ngược lại).

## 1. Nguồn đã dùng

| Nguồn | Đạt ngưỡng? | File |
|---|---|---|
| Đào data (x/N, %, cách đếm chạy lại được, ≥5 ví dụ) | ☑ *(đủ số tổng hợp từ script, bổ sung ≥5 ví dụ mã dòng ẩn danh nếu cần)* | `scripts/mine_room_changes.py` · `docs/PLAN.md` |
| Phỏng vấn (≥3 người ngoài nhóm, đúng người dùng) | ☐ *(chưa có file phỏng vấn trong repo)* | `evidence/interviews/P1.md`… |
| Khảo sát (≥20 người ngoài nhóm, đúng người dùng) | ☑ *(21/20 phiếu — đạt ngưỡng)* | `evidence/survey/README.md` · `evidence/survey/results.csv` |

## 2. Số chính

- **Đào data** (`scripts/mine_room_changes.py` trên TKB thật): `N = 1,083` học viên · trung vị **7** phòng khác nhau trong 4 tuần (tối đa **15** phòng) · **1,083/1,083 (100%)** học viên phải di chuyển qua **≥ 2 tòa nhà** · **78/124 (63%)** buổi học chia qua **≥ 2 phòng** · trung vị **92%** cặp buổi học liên tiếp có đổi phòng *(cao do lịch xen kẽ sáng LAB / chiều LEC)*.
- **Phỏng vấn:** __/3 người gặp *(chưa có biên bản phỏng vấn trong `evidence/interviews/`)* · số lần / tháng: P1 __, P2 __, P3 __ · mỗi lần mất __–__ phút
- **Khảo sát (`n = 21`, [evidence/survey/results.csv](survey/results.csv)):**
  - **19/21 (90.5%)** đã từng bỏ lỡ hoặc nhầm lịch (buổi học, sự kiện/workshop, deadline hoặc họp mentor).
  - **19/21 (90.5%)** phải kiểm tra lịch hàng ngày (`13/21` nhiều lần/ngày).
  - **11/21 (52.4%)** mất **≥ 15 phút/tuần** chỉ để xem và tổng hợp lịch (`8` mất 15–30', `1` mất 30–60', `2` mất > 1 giờ; `10` mất dưới 15').
  - **16/21 (76.2%)** nhận lịch từ ≥ 2 nguồn và **18/21 (85.7%)** muốn dùng trên điện thoại / cả web lẫn app.

Phỏng vấn nhiều vai thì đếm theo từng vai, không cộng chung.

| | Vai | Gặp pain? | Số lần / 1 tháng qua | Lần gần nhất mất | Đang xoay xở bằng |
|---|---|---|---|---|---|
| P1 | *(nhóm tự điền nếu phỏng vấn thêm)* | | | | |
| P2 | | | | | |
| P3 | | | | | |

## 3. ≥5 trích dẫn hoặc ví dụ nguyên văn (có nguồn, bỏ tên)

1. *"tôi có chụp ảnh lịch học từ trang html xong 1 lần nhìn nhầm lịch học vì chữ trong ảnh khá bé nên khi xem tôi phải zoom ảnh lên có lần tôi bị nhầm lịch ghi 16 giờ 30 thì tôi tưởng học lúc 14 giờ mà nhà tôi khá xa trường mất 1 giờ di chuyển nên tôi thường đi trước 1 giờ 20 phút nên hôm đấy tôi đến khá sớm và phải đợt khá lâu nên cảm thấy khá mệt"* — phiếu khảo sát `S07`
2. *"Buổi Workshop hôm thứ 3, tuy có kênh thông báo riêng nhưng bị trôi do các thông báo ở kênh khác và quên kiểm tra lại"* / *"nhiều nguồn rời rạc, phải double check lại và nhiều khi không nhớ lịch được thông báo ở đâu"* — phiếu khảo sát `S02`
3. *"Lần nghỉ 3 ngày thì tôi có bõ lở 1 buổi WS"* / *"Các kênh thông tin rời rạc"* — phiếu khảo sát `S01`
4. *"lịch k thuận tiện vì khó xem trên điện thoại"* — phiếu khảo sát `S03`
5. *"không có 1 app riêng hỗ trợ trên điện thoại của sinh viên"* — phiếu khảo sát `S05`

## 4. Các nguồn có khớp nhau không

Data nói **100% học viên (`1,083/1,083`)** phải học qua ≥ 2 tòa nhà và trung vị **7 phòng khác nhau** trong 4 tuần (63% buổi học tách nhiều phòng); người dùng trong khảo sát (`n = 21`) nói **90.5% (`19/21`)** từng bỏ lỡ/nhầm lịch, **76.2%** xem lịch từ ≥ 2 nguồn và **76.2%** dùng điện thoại thường xuyên nên việc mở file HTML/chụp ảnh TKB rất khó nhìn và dễ nhầm giờ/phòng (`S03`, `S05`, `S07`). Hai nguồn **khớp hoàn toàn** với nhau.

## 5. Kết luận

Giả thuyết ở `evidence/hypothesis.md`: **đúng** — cả dữ liệu lịch học (`N = 1,083`) lẫn khảo sát thực tế (`n = 21`) đều khẳng định pain đến từ việc lịch học (HTML Outlook) và lịch sự kiện (Phoenix/Discord) bị tách rời, khó xem trên điện thoại và đổi phòng liên tục, dẫn đến 90.5% người được hỏi từng nhầm hoặc lỡ lịch.

## Lịch hẹn (dùng cho CP2 — chỉ ghi vai và giờ, không tên)

| Vai | Giờ hẹn | Đã xong? |
|---|---|---|
| | | |
