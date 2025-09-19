# Ôn tập Toán 8 – Chương I (DEMO 40 câu)

Demo web app (GitHub Pages + Google Sheets) theo yêu cầu:

- 40 câu ngẫu nhiên/1 lần làm (ưu tiên điền khuyết).
- 45 phút/đề, tự chấm (0.25 điểm/câu), thang 10.
- Gợi ý chủ đề cần ôn lại theo các câu sai.
- Ghi kết quả về **Google Sheets** (Apps Script Web App).

## Cấu trúc
```
index.html     # giao diện
script.js      # logic + gửi dữ liệu
questions.json # 60 câu mẫu (đủ để random 40)
apps_script.gs # code Google Apps Script (Web App)
```

## Hướng dẫn triển khai nhanh

### 1) Google Sheets + Apps Script
1. Tạo một Google Sheet mới, ở hàng 1 đặt tiêu đề cột:
   - `Timestamp | runId | Name | Class | Attempt | Score | Correct | Total | TimeTakenSec | RemainSec | SelectedIds | WrongTopics`
2. Vào **Extensions → Apps Script**, tạo project mới và dán **toàn bộ nội dung** file `apps_script.gs` vào.
3. Thay `SHEET_ID` trong code thành **ID** của Google Sheet (chuỗi giữa `/d/` và `/edit` trong URL).
4. Chọn **Deploy → New deployment → Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
   - Bấm **Deploy** và sao chép **Web App URL**.

### 2) Sửa `script.js`
- Mở file `script.js`, thay dòng:
  ```js
  const SHEET_WEB_APP_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
  ```
  bằng URL Web App bạn vừa copy.

### 3) Đưa lên GitHub Pages
1. Tạo repo, upload 3 file: `index.html`, `script.js`, `questions.json` (không cần `apps_script.gs`).
2. Vào **Settings → Pages → Build and deployment**:
   - *Source*: **Deploy from a branch**
   - *Branch*: `main` (root)
3. Lấy URL GitHub Pages để phát cho học sinh.

> Lưu ý: Bạn có thể mở rộng `questions.json` lên 500 câu (bỏ bài *phép chia đa thức*). Chỉ cần đảm bảo mỗi câu có cấu trúc:
> ```json
> { "id": 101, "question": "…", "answer": "…", "topic": "…", "hint": "…" }
> ```

## Quy tắc tránh trùng câu khi làm lại
- Mỗi học sinh (theo `Họ tên + Lớp`) sẽ có lịch sử `usedIds` lưu ở LocalStorage để ưu tiên chọn câu **chưa làm**.
- Nếu ngân hàng còn lại < 40 câu mới, hệ thống sẽ bù từ toàn bộ ngân hàng.

## Gợi ý mở rộng
- Thêm xác thực “Giáo viên” để xem bảng xếp hạng.
- Xuất CSV tất cả lần làm (cũng có thể lấy trực tiếp từ Google Sheets).
- Thêm audio/hiệu ứng và chuyển sang phiên bản sản xuất.
