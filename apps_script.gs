// === Google Apps Script (triển khai thành Web App) ===
// 1) Tạo Google Sheet trống, đặt tên các cột ở hàng 1, ví dụ:
//    A: Timestamp, B: runId, C: Name, D: Class, E: Attempt, F: Score, G: Correct, H: Total,
//    I: TimeTakenSec, J: RemainSec, K: SelectedIds, L: WrongTopics
// 2) Mở Extensions → Apps Script, dán code này, đặt SHEET_ID.
// 3) Deploy → New deployment → Type: Web app → Execute as: Me, Who has access: Anyone.
// 4) Copy Web App URL và dán vào file script.js (SHEET_WEB_APP_URL).

const SHEET_ID = "PUT_YOUR_SHEET_ID_HERE";

function doPost(e) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheets()[0];

    const body = JSON.parse(e.postData.contents);
    const time = new Date();
    const selectedIds = (body.selectedIds || []).join(",");
    const wrongTopics = (body.wrongTopics || []).map(x => x.join(":")).join(","); // "topic:count"

    sh.appendRow([
      time,
      body.runId || "",
      body.name || "",
      body.class || "",
      body.attempt || "",
      body.score || "",
      body.correct || "",
      body.total || "",
      body.timeTakenSec || "",
      body.remainSec || "",
      selectedIds,
      wrongTopics
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
      .setHeader("Access-Control-Allow-Headers", "Content-Type");
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
      .setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
}

function doGet() {
  return ContentService
    .createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*");
}
