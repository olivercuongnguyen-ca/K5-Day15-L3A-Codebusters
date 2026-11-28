# Tóm tắt mô phỏng simulate-1@20261128-111034

Do `python run.py simulate` sinh ra — không sửa tay. Chép bảng sang `cost/cost-estimate.md`.

| Persona | Số phiên mô phỏng | Lượt hỏi / phiên | Token vào / phiên | Token ra / phiên | Gọi model / phiên | Gọi công cụ / phiên |
|---|---:|---:|---:|---:|---:|---:|
| dung_it | 4 | 1 | 0 | 0 | 0.0 | 0.0 |
| dung_vua | 16 | 2 | 95 | 18 | 0.1 | 0.4 |
| dung_nhieu | 30 | 3 | 252 | 49 | 0.3 | 1.0 |

Tỉ lệ đạt dùng để tính: 19/20 (95%) — lượt run-2@20261128-104257

- Tỉ lệ đạt lấy từ lượt nhóm chọn: eval/run-2.csv (--rate-from).

| Model (giá) | Chi phí / phiên | Chi phí / task thành công | Chi phí / câu hỏi đạt | Chi phí / tháng — thấp (300 người) | Chi phí / tháng — cơ sở (700 người) | Chi phí / tháng — cao (1.083 người) | Chi phí / người / tháng (cơ sở) |
|---|---:|---:|---:|---:|---:|---:|---:|
| openai/gpt-4o-mini (vào 0.15 · ra 0.6 $/1M) | $0.000048 (≈ 1 ₫) | $0.000051 (≈ 1 ₫) | $0.000020 (≈ 1 ₫) | $0.4125 (≈ 10.478 ₫) | $0.9626 (≈ 24.449 ₫) | $1.49 (≈ 37.826 ₫) | $0.0014 (≈ 35 ₫) |
| google/gemini-2.5-flash (vào 0.3 · ra 2.5 $/1M) | $0.00014 (≈ 4 ₫) | $0.00015 (≈ 4 ₫) | $0.000060 (≈ 2 ₫) | $1.22 (≈ 30.868 ₫) | $2.84 (≈ 72.026 ₫) | $4.39 (≈ 111.434 ₫) | $0.0041 (≈ 103 ₫) |

- Chi phí / task thành công = chi phí / phiên ÷ tỉ lệ đạt. Chi phí / câu hỏi đạt = chi phí / phiên ÷ số lượt hỏi trung bình mỗi phiên (2.5) ÷ tỉ lệ đạt — tỉ lệ đạt đo theo từng câu thử.
- Token đo trên model: openai/gpt-4o-mini. Giá tính theo từng model trong bảng — model khác bộ tách token thì số token thật có thể lệch; ghi rõ "đo trên model X, tính giá model Y" trong cost/cost-estimate.md.
- Phiên lỗi (không tính vào trung bình): 0/50.
- Tỷ giá: 1 USD = 25.400 ₫ (tỷ giá tham khảo (tự ước tính 28/11/2026)).
