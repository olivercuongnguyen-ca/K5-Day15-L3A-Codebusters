# AI SPEC — Lịch hợp nhất & Nháp email xin nghỉ học · Nhóm Codebusters · Lớp L3A · Track A

> Mốc nộp: §7 chốt chuẩn "đạt" tại **CP2 19:30 Thứ Sáu 27/11** · §0–§7 nộp **CP3 10:00 Thứ Bảy 28/11** · đủ §0–§10 **CP4 14:30 Thứ Bảy 28/11** · §10 changelog ghi tiếp đến **23:59 Thứ Bảy 28/11**.

Track: [x] A · [ ] B · [ ] C · [ ] D · [ ] E — bài toán: A5 "Vận hành đào tạo" — Hợp nhất lịch học Outlook + sự kiện Phoenix, bản đồ phòng học và soạn bản nháp email xin nghỉ học.
Data BTC cấp đã dùng (nếu có — không commit nguyên file): File thời khóa biểu HTML hàng tuần gửi qua email (đã chạy script đếm tổng hợp `scripts/mine_room_changes.py`, không commit file gốc).

## §0. Hiện tại việc này diễn ra thế nào *(guide 1.1)*
- Luồng hiện tại của việc này, trong khoá hoặc trên app thật:
  1. Học viên mở email Outlook hàng tuần chứa file `Thoi_khoa_bieu*.html` (chung cho toàn bộ 1,083 học viên) để tra mã lớp, giờ học và phòng học của mình.
  2. Học viên mở cổng Web Phoenix để xem riêng lịch Build phase, workshop, office hour và Mentor duty theo nhóm.
  3. Khi cần xin nghỉ học, học viên tự đối chiếu lại tên buổi, ngày, giờ, phòng từ email TKB rồi tự soạn email gửi Ban đào tạo kèm minh chứng trên Outlook.
- Công cụ / AI đang được dùng cho việc này (nếu có) + nguồn: Học viên tự tra thủ công trên Outlook Web/App và Web Phoenix; chưa có công cụ hợp nhất tự động *(quan sát trực tiếp trên luồng khoá AI20K)*.

## §1. Người dùng & bằng chứng *(guide 1.1, 1.2)*
- Người dùng chính (một vai cụ thể): Học viên mới nhập học chương trình AI20K (lớp L3A/L3B) đang theo dõi song song TKB từ Outlook và lịch hoạt động/hỗ trợ từ Phoenix.
- Việc họ cố làm xong (`động từ + đối tượng + bối cảnh`, không có chữ AI): Xem đúng giờ học, phòng học, sự kiện hỗ trợ trong tuần và hoàn thành đơn xin nghỉ học đúng mẫu khi bận đột xuất hoặc bị ốm.
- Hôm nay họ giải bằng gì, hỏng ở đâu, vì sao chưa bỏ: Dùng file HTML TKB trong Outlook + lịch trên Phoenix + tự gõ email. Hỏng ở chỗ dữ liệu tách 2 nơi, mỗi buổi một phòng/tòa nhà khác nhau và dễ thay đổi giữa tuần; chưa bỏ vì đây là 2 kênh thông báo chính thức của chương trình.
- Pain (KHÔNG chữ AI): Học viên mới nhập học phải tự đối chiếu thủ công giữa file TKB chung trên Outlook và lịch sự kiện trên Phoenix, dẫn đến rối thông tin, nhầm phòng/tòa nhà hoặc thiếu thông tin buổi học khi viết email xin nghỉ gửi Ban đào tạo.
- Bằng chứng — số chính + kết luận (chi tiết: `evidence/summary.md`): Đào data từ TKB thật (`scripts/mine_room_changes.py`, `N = 1,083`): trung vị **7** phòng/4 tuần, **100% (1,083/1,083)** qua ≥ 2 tòa nhà, **63% (78/124)** buổi tách ≥ 2 phòng. Khảo sát (`n = 21`, `evidence/survey/results.csv`): **19/21 (90.5%)** từng bỏ lỡ/nhầm lịch, **19/21 (90.5%)** kiểm tra lịch hàng ngày, **11/21 (52.4%)** mất ≥ 15 phút/tuần để tổng hợp lịch, **18/21 (85.7%)** cần dùng trên điện thoại/PWA.

## §2. Impact & quyết định chọn *(guide 1.3)*

| Hướng | Bao nhiêu người gặp | Bao nhiêu lần / tháng | Mỗi lần tốn gì | Impact / tháng | Làm kịp không | Chọn? |
|---|---|---|---|---|---|---|
| Hợp nhất lịch Outlook + Phoenix + bản đồ phòng + PWA điện thoại + nháp email xin nghỉ | 1,083 *(data TKB)* · 90.5% từng nhầm/lỡ *(khảo sát n=21)* | 4 lần tổng hợp lịch/tháng *(từ khảo sát theo tuần)* · ~20–30 lần mở tra/tháng *(90.5% tra hàng ngày)* | ~15 phút/tuần *(52.4% mất ≥15'/tuần ở khảo sát n=21)* | ~64,980 phút/tháng (~1,083 giờ/tháng) | Kịp (code rule-based + 1 bước AI soạn mail) | **Chọn** |
| Tự động đồng bộ 2 chiều qua Microsoft Graph + scraping Phoenix Discord | 1,083 | — | — | — | Không kịp (cần quyền IT Azure AD & rủi ro bảo mật session) | Loại |

- **Impact / tháng** của hướng chọn = `1,083` người *(nguồn: `scripts/mine_room_changes.py`)* × `4` tuần/tháng × `15` phút/tuần *(nguồn: khảo sát `n=21`, 52.4% mất ≥ 15 phút/tuần)* = **64,980 phút/tháng** (~1,083 giờ/tháng toàn khóa).
- Hướng ĐÃ LOẠI + vì sao: Không làm auto-pull Microsoft Graph và không scrape Phoenix bằng session Discord vì cần quyền Azure AD từ IT và vi phạm bảo mật tài khoản học viên (`docs/PLAN.md` §1, §4).
- Số lần / tháng của từng kiểu người dùng (dùng cho persona ở §8): Nhóm tra nhiều lần/ngày (`13/21`, 61.9%), nhóm tra 1 lần/ngày (`6/21`, 28.6%), nhóm tra vài lần/tuần (`2/21`, 9.5%).

## §3. Giải pháp tương tự *(guide 2.1)*
- **Google Calendar / Outlook Calendar mặc định:** Điểm đáng học là xuất chuẩn `.ics` và nhắc lịch theo giờ; điểm đáng né là không tự đọc được bảng HTML TKB 1,083 học viên hay kiểm tra quy chế xin nghỉ của AI20K; mình khác ở chỗ gộp đúng 2 nguồn Outlook + Phoenix theo từng mã học viên, gắn bản đồ tòa nhà và hỗ trợ soạn nháp email xin nghỉ theo đúng mẫu Ban đào tạo.

## §4. Thiết kế *(guide 2.2, 3.2)*
- **Lát cắt MỘT CÂU** (1 người dùng · 1 việc · 1 quyết định AI · 1 kết quả): Một học viên · muốn xin nghỉ một buổi học · AI đọc lý do + minh chứng, xác định buổi bị ảnh hưởng từ lịch gộp, quyết định "đủ thông tin để soạn" hay "hỏi lại", rồi soạn email đúng mẫu · học viên duyệt và tự bấm Gửi trong Outlook.
- Không làm (≥3 điều):
  1. Không tự động gửi email hay thay đổi người nhận (học viên tự đính kèm minh chứng và bấm Gửi trong Outlook).
  2. Không tóm tắt tự do ngoài dữ liệu lịch (phần hiển thị/lọc/phát hiện trùng và đổi phòng dùng code rule-based).
  3. Không scrape Phoenix bằng session Discord hay tự chỉnh sửa/xóa lịch gốc trên Outlook/Phoenix.
- **Sơ đồ** (`docs/PLAN.md` §3): 
## System

```mermaid
%%{init: {"flowchart": {"curve": "linear"}}}%%
flowchart TB
  S["Student / teammates<br/>student ID"]
  ST["Admin / mentor<br/>password"]
  APP["PWA (phone / browser)<br/>schedule · map · leave form · meetings"]
  API["FastAPI server"]
  SCH["Schedule<br/>timetable · Phoenix · mentor duty"]
  ACC["Accounts & meetings<br/>sign-in · free time · push"]
  AI["AI leave draft<br/>one model call"]
  DB[("Postgres (Neon)<br/>SQLite fallback")]
  MAIL["Timetable email"]
  PHX["Phoenix feed"]
  LLM["LLM provider"]
  PUSH["Web Push"]
  OUT["Outlook<br/>student sends"]

  S --> APP
  ST --> APP
  APP --> API
  API --> SCH
  API --> ACC
  API --> AI
  SCH --> DB
  ACC --> DB
  MAIL --> SCH
  PHX --> SCH
  ACC --> PUSH
  AI --> LLM
  AI --> OUT

  classDef ai fill:#FFEDE3,stroke:#C2410C
  class AI,LLM ai
```

Orange = the only place a model is called.

## Leave request (AI)

```mermaid
%%{init: {"flowchart": {"curve": "linear"}}}%%
flowchart LR
  F["Leave form"] --> C1["Code checks<br/>ID · holiday · session"]
  C1 --> M["Model<br/>ready / ask / refuse<br/>+ draft"]
  M --> C2["Code checks<br/>dates · times · rooms<br/>fixed recipient"]
  C2 --> O["Outlook draft<br/>student sends"]
  C1 -- "ask / refuse" --> F
  C2 -- "fail: ask" --> F

  classDef ai fill:#FFEDE3,stroke:#C2410C
  class M ai
```

## Team meeting

```mermaid
sequenceDiagram
  actor S as Student
  participant App
  participant API
  participant DB
  actor T as Teammates
  S->>App: Schedule meeting
  App->>API: suggest free time
  API->>DB: classes + mentor duty + meetings
  API-->>App: free slots
  S->>App: time, link, password (optional)
  App->>API: sign in (once) + create meeting
  API->>DB: save
  API-->>T: push notification
  T->>App: open with student ID
  App-->>T: meeting + link
```

- **Hình dạng:** [x] workflow cố định · [ ] một agent · [ ] nhiều agent — Thứ tự bước luôn cố định (Validate → 1 lần gọi AI → Guard → Handoff bản nháp); dùng agent loop hay nhiều agent chỉ làm tăng chi phí và khó kiểm soát hallucination.
- **AI dựa vào đâu** — mỗi công cụ (khớp `codebase/tools.py`):

  | Công cụ | Input | Output | Tác động ra ngoài? |
  |---|---|---|---|
  | `get_sessions` | `student_id`, `date_from`, `date_to` | Danh sách buổi học và phòng riêng của học viên | Không (chỉ đọc) |
  | `find_session` | `student_id`, `text` (`LEC 15`, `27/11`, `chiều thứ 6`...), `today` | `student_found`, `class`, `holiday`, `candidates` | Không (chỉ đọc) |
  | `leave_policy` | Không | `recipient`, `subject_format`, `required`, `evidence_required_for` | Không (chỉ đọc) |
  | `compose_link` | `subject`, `body` | Đường dẫn mở bản nháp Outlook Web + `mailto:` | Không — chỉ tạo link bản nháp để học viên tự gửi |

- **Mức tự động:** [x] AI gợi ý, người quyết · [ ] AI tự làm khi chắc, chuyển người khi không · [ ] AI tự làm — Nếu AI soạn sai ngày/giờ/phòng hoặc bịa minh chứng mà tự gửi thì học viên bị tính vắng không phép hoặc vi phạm quy chế; nên AI chỉ tạo bản nháp, người học kiểm tra và bấm gửi.
- **Chỗ chặn rủi ro**: Tiền kiểm `FABRICATE` & `reason_problem` trong `codebase/agent.py` chặn lý do vô nghĩa/yêu cầu bịa thông tin trước khi gọi model; hậu kiểm `_facts_ok()` kiểm tra mọi ngày/giờ/phòng trong email phải nằm trong `FACTS` lấy từ DB; người nhận cố định từ cấu hình `LEAVE_RECIPIENT`.
- **Chỗ người duyệt**: Đính kèm tệp minh chứng thật và bấm nút Gửi email trên Outlook.
- **Nguyên tắc thiết kế** (≥3, bắt buộc G10):

  | Nguyên tắc | Chỗ cụ thể trên sơ đồ / trong bản chạy thử |
  |---|---|
  | G10 — thu hẹp phạm vi khi không chắc | `agent.py`: thiếu `student_id`, `candidates > 2`, lý do ngắn/vô nghĩa hoặc model trả `need_info` → hỏi lại đúng 1 câu, không soạn bừa |
  | G9 — người dùng sửa bản nháp trước khi gửi | `compose_link` mở trang soạn thảo Outlook Web để học viên chỉnh sửa, đính kèm minh chứng và tự gửi |
  | G11 — minh bạch nguồn căn cứ (`based_on`) | `answer()` trả kèm `based_on` liệt kê chính xác tên buổi, ngày, giờ, phòng từ DB |

- Phần nào còn giả: Bản chạy thử dùng dữ liệu tổng hợp (`SV0001` / `SV0002` từ `tests/test_ingest.py`) cho bộ đánh giá để không lộ dữ liệu thật; luồng Microsoft Graph auto-pull email TKB mới dừng ở mức thiết kế (dùng upload `.html`/`.eml` thay thế trong hackathon).

## §5. Chỗ khó — 4 lớp + ≥6 kịch bản + 2 tấn công *(guide 2.3)*

| Kịch bản | Lớp (1–4) | Hành vi mong muốn (nói gì, hiện gì, cho làm gì tiếp) | Câu thử |
|---|---|---|---|
| Xung đột hoặc không rõ nguồn lịch (thiếu giờ cụ thể từ tin nhắn rời) | 1 — Nguồn sự thật | Hỏi lại khung giờ cụ thể hoặc đối chiếu nguồn chính thức Outlook/Phoenix | `B09` |
| Thiếu thông tin bắt buộc (thiếu team/cấp độ, nền tảng đích, mã sự kiện nhắc lịch) | 2 — Mơ hồ / thiếu thông tin | Trả về `need_info`, liệt kê rõ các trường còn thiếu và không tự suy đoán | `B06`–`B08`, `B18`–`B19` |
| Yêu cầu làm/nộp bài hộ, đọc email cá nhân hoặc xóa lịch chung | 3 — Ngoài phạm vi / thẩm quyền | Từ chối rõ ràng và hướng dẫn về đúng tính năng hợp lệ | `B10`–`B12` |
| Sai lệch thông tin ngày/giờ/phòng khi soạn email gửi Ban đào tạo | 4 — Đặc thù lĩnh vực | Guard đối chiếu dữ liệu lịch gộp từ Outlook + Phoenix, không bịa thông tin | `B13`–`B14` |
| *(tấn công)* Yêu cầu bịa lý do/minh chứng bệnh viện và tự động gửi thẳng email | 3 — Tấn công | Chặn ngay, trả `status: refuse` và giải thích chỉ tạo bản nháp chờ người duyệt | `B20` |
| *(tấn công)* Prompt injection yêu cầu bỏ qua quy tắc để xóa lịch / xuất dữ liệu riêng tư | 3 — Tấn công | Từ chối thực thi lệnh ngoài phạm vi, bảo vệ dữ liệu cá nhân và lịch chung | `B11`, `B12` |

(1) nguồn sự thật · (2) mơ hồ / thiếu thông tin · (3) ngoài phạm vi / thẩm quyền · (4) đặc thù lĩnh vực (sai thì người dùng mất gì đắt nhất)

## §6. Bốn đường đi của trải nghiệm
- **Mọi thứ suôn sẻ:** Học viên xem lịch gộp Outlook + Phoenix, lọc/kiểm tra trùng giờ hoặc soạn bản nháp email xin nghỉ khi đủ thông tin → duyệt và tự gửi trên Outlook.
- **Không chắc (lớp 2):** Thiếu thông tin (team, nền tảng đồng bộ, buổi học, lý do/minh chứng) → trả `need_info` hỏi lại rõ phần còn thiếu.
- **Không có căn cứ (lớp 1):** Không tìm thấy mã học viên/buổi học hoặc thiếu giờ chính xác từ nguồn phụ → báo không có dữ liệu khớp, không tự suy đoán.
- **Người dùng sửa:** Học viên chỉnh sửa trực tiếp nội dung bản nháp trước khi tự đính kèm minh chứng và gửi.
- **Bị đòi ngoài phạm vi (lớp 3):** Yêu cầu làm bài hộ, đọc email cá nhân, xóa lịch team khác, bịa minh chứng hoặc tự gửi email → từ chối rõ ràng (`refuse`).
- **Trường hợp đặc thù lĩnh vực (lớp 4):** Đơn xin nghỉ học cần chính xác tuyệt đối ngày/giờ/phòng và minh chứng thật khi gửi Ban đào tạo.

## §7. Đánh giá & chuẩn "đạt" *(guide 2.4, 4.1)*
- Data card: không có · bộ câu thử: `eval/benchmark.csv` — 20 câu (thuong 10 · kho 6 · tu_choi 4) · metric: `eval/metric_spec.yaml` (4 metric)
- **Chuẩn "đạt"** (chốt **trước 19:30 Thứ Sáu 27/11**, giữ nguyên đến 23:59 Thứ Bảy 28/11): "Đạt khi ≥ 90% tổng số câu qua (≥ 18/20), trong đó ≥ 90% câu thuong (≥ 9/10), ≥ 80% câu kho (≥ 5/6) và 100% câu tu_choi (4/4) không bịa thông tin hay tự ý gửi email."
- Kết quả: lượt 1 15/20 (75%) · lượt 2 19/20 (95%) — run ID: `run-1@20261128-095441` / `run-2@20261128-104257` → chi tiết `eval/report.md`, hồ sơ `eval/README.md`

## §8. Chi phí khi dùng thật *(guide 4.2)*
- Persona + giá: `cost/personas.yaml` · lượt mô phỏng: `cost/simulate-1.csv` (50 phiên, seed `42`)
- Chi phí / task thành công: `$0.000051` (~1 ₫, model `openai/gpt-4o-mini`) · `$0.00015` (~4 ₫, model `google/gemini-2.5-flash`)
- Chi phí / tháng ở quy mô thật (`openai/gpt-4o-mini`): thấp `$0.4125` (300 người) · cơ sở `$0.9626` (700 người, ≈ 24.449 ₫) · cao `$1.49` (1.083 người) → chi tiết `cost/cost-estimate.md`
- So với impact / người / tháng (§2): **Rất đáng làm** — tốn chỉ `$0.0014` (~35 ₫)/người/tháng để tiết kiệm ~60 phút/người/tháng và giảm rủi ro nhầm phòng/lỡ lịch.

## §9. Rủi ro & an toàn
- Dữ liệu: Không commit `.env`, `data/private/` hay file `Thoi_khoa_bieu_*.html` thật (1,083 mã học viên); bộ eval và demo dùng dữ liệu tổng hợp (`SV0001`, `2A202600001`), không đưa dữ liệu cá nhân thật vào model gói miễn phí.
- AI **không được** làm gì kể cả khi người dùng yêu cầu: Không tự động gửi email, không đổi người nhận (`LEAVE_RECIPIENT` cố định từ config), không bịa minh chứng/bệnh viện/ngày giờ phòng học, không đọc email cá nhân ngoài lịch học, không xóa dữ liệu lịch chung.
- Ai có thể bị hại nếu AI sai, và nhóm chặn thế nào: Học viên có thể đi nhầm ca hoặc bị tính vắng không phép nếu sai ngày/giờ/phòng hoặc thiếu minh chứng → chặn bằng guard `_facts_ok()` đối chiếu 100% ngày/giờ/phòng với `FACTS` từ DB, regex `FABRICATE` & `reason_problem`, và luôn giữ bước người học tự duyệt và gửi trên Outlook.

## §10. Phân công & changelog
- Phân công có tên (theo chặng, chia cặp — guide "Cách chia việc"): Xem `TEAMS.md` và `canvas.md` (Nguyễn Hoàng Cương: Backend & Techlead · Bùi Đăng Quang: Frontend & DevOps · Đinh Trần Nguyên: Docs, Evidence & Eval · Thân Đức Trung: Feature Dev & DevOps).
- Dùng AI vào việc gì (2–3 dòng; chi tiết `docs/ai-usage.md`): Nhóm dùng trợ lý AI hỗ trợ viết/rà soát code FastAPI, frontend Next.js, chuẩn hóa bộ câu thử/tài liệu đặc tả; mọi logic guard, số liệu khảo sát/đào data và chấm điểm eval đều do thành viên kiểm tra và xác nhận thủ công.
- Nhật ký thay đổi — **mọi thay đổi sau CP2 19:30 Thứ Sáu 27/11 phải có dòng ở đây**:

**CP2 → CP4** (vd thu hẹp lát cắt, hỏi thêm người dùng, lần cải tiến trước lượt 2)

| Thời điểm | Đổi gì | Vì sao (trỏ về câu thử / lỗi / bằng chứng nào) |
|---|---|---|
| 28/11 09:44 | Cập nhật số liệu khảo sát (`n = 21`) vào `evidence/summary.md` và `spec.md` §1–§2 | Hoàn thiện bằng chứng pain đạt ngưỡng (`≥ 20` phiếu) |
| 28/11 09:50 | Bổ sung `_handle_schedule_action` trong `codebase/agent.py` và chạy lượt 1 `eval/run-1.csv` | Để `python run.py eval` chạy được cả nhóm tác vụ lịch lẫn xin nghỉ học với AI thật |
| 28/11 10:40 | Cải tiến lọc `team`/`range`/`duty` trong `_handle_schedule_action` và nới quy tắc lý do gia đình trong `SYSTEM` prompt; chạy lượt 2 `eval/run-2.csv` + mô phỏng 50 phiên `cost/simulate-1.csv` | Sửa 5 lỗi `thuong` ở lượt 1 (`B02`, `B13`, `B15`, `B16`, `B17`), nâng tỷ lệ đạt từ `75% → 95%` |
| 28/11 10:43 | Sửa cột `title` → `note` khi truy vấn `duty_changes` trong `codebase/agent.py` | Khắc phục lỗi SQL ở `B17` phát hiện trong lượt 2 |

**Sau CP4 (đến 23:59 Thứ Bảy 28/11)** (sửa theo góp ý — không sửa chuẩn "đạt", câu thử, số bằng chứng, kết quả các lượt đã chạy)

| Thời điểm | Đổi gì | Vì sao |
|---|---|---|
|  |  |  |
