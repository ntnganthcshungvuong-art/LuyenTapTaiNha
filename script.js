// ====== CẤU HÌNH ======
// Điền URL Web App của Google Apps Script sau khi bạn triển khai (step trong README).
const SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwpfLkue5ySQZJYmsAjorSw3mZNULTC_Vc_9Dnp5PY/dev";

// Thời gian làm bài (giây): 45 phút = 2700s
const DURATION_SEC = 45 * 60;

// Số câu cho mỗi lần làm
const QUESTION_COUNT = 40;

// ====== TIỆN ÍCH ======
function normalizeAnswer(s) {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/,/g, "."); // chấm/phẩy
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function getKey(studentName, studentClass) {
  return `toan8demo_${studentName}_${studentClass}`;
}
function getAttemptNo(studentName, studentClass) {
  const k = getKey(studentName, studentClass) + "_attemptNo";
  const n = parseInt(localStorage.getItem(k) || "0", 10);
  return n + 1;
}
function bumpAttempt(studentName, studentClass) {
  const k = getKey(studentName, studentClass) + "_attemptNo";
  const n = parseInt(localStorage.getItem(k) || "0", 10);
  localStorage.setItem(k, String(n + 1));
}
function getUsedIds(studentName, studentClass) {
  const k = getKey(studentName, studentClass) + "_usedIds";
  try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; }
}
function pushUsedIds(studentName, studentClass, ids) {
  const k = getKey(studentName, studentClass) + "_usedIds";
  const old = getUsedIds(studentName, studentClass);
  const merged = Array.from(new Set([...old, ...ids]));
  localStorage.setItem(k, JSON.stringify(merged));
}
function saveDraft(studentName, studentClass, draft) {
  const k = getKey(studentName, studentClass) + "_draft";
  localStorage.setItem(k, JSON.stringify(draft));
}
function loadDraft(studentName, studentClass) {
  const k = getKey(studentName, studentClass) + "_draft";
  try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; }
}
function clearDraft(studentName, studentClass) {
  const k = getKey(studentName, studentClass) + "_draft";
  localStorage.removeItem(k);
}

// ====== TRẠNG THÁI TOÀN CỤC ======
let allQuestions = [];
let selected = [];
let answers = {}; // id -> string
let timerId = null;
let remain = DURATION_SEC;
let curStudent = { name: "", cls: "", attempt: 1, startedAt: 0, runId: "" };

// ====== KHỞI TẠO ======
async function bootstrap() {
  document.getElementById("startBtn").addEventListener("click", onStart);
  document.getElementById("submitBtn").addEventListener("click", onSubmit);
  document.getElementById("saveDraftBtn").addEventListener("click", onSaveDraft);
  document.getElementById("retryBtn").addEventListener("click", onRetry);

  // tải ngân hàng câu hỏi
  const res = await fetch("./questions.json");
  allQuestions = await res.json();

  // Tự động nộp khi hết giờ
  window.addEventListener("beforeunload", (e) => {
    // cảnh báo nếu đang làm dở
    if (document.getElementById("examCard").classList.contains("hidden") === false) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}
document.addEventListener("DOMContentLoaded", bootstrap);

// ====== XỬ LÝ BẮT ĐẦU ======
function onStart() {
  const name = document.getElementById("studentName").value.trim();
  const cls = document.getElementById("studentClass").value.trim();
  if (!name || !cls) {
    alert("Vui lòng nhập Họ tên và chọn Lớp.");
    return;
  }
  curStudent.name = name;
  curStudent.cls = cls;
  curStudent.attempt = getAttemptNo(name, cls);
  curStudent.startedAt = Date.now();
  curStudent.runId = uid();

  document.getElementById("who").textContent = name;
  document.getElementById("whichClass").textContent = cls;
  document.getElementById("attemptNo").textContent = curStudent.attempt;

  // chọn 40 câu khác với usedIds (nếu có thể)
  const used = new Set(getUsedIds(name, cls));
  const poolNew = allQuestions.filter(q => !used.has(q.id));
  let chosen = [];
  if (poolNew.length >= QUESTION_COUNT) {
    chosen = shuffle(poolNew).slice(0, QUESTION_COUNT);
  } else {
    // lấy hết phần mới + bù từ toàn bộ ngân hàng
    const rest = shuffle(allQuestions).filter(q => !poolNew.includes(q));
    chosen = shuffle([...poolNew, ...rest]).slice(0, QUESTION_COUNT);
  }
  selected = chosen;

  // Hiển thị UI
  document.getElementById("loginCard").classList.add("hidden");
  document.getElementById("examStatus").classList.remove("hidden");
  document.getElementById("examCard").classList.remove("hidden");

  // Render câu hỏi
  renderQuestions();

  // Thời gian
  const savedDraft = loadDraft(name, cls);
  if (savedDraft && savedDraft.runId === curStudent.runId) {
    // hiếm khi trùng, bỏ qua
  }
  startTimer();
}

function renderQuestions() {
  const wrap = document.getElementById("questionsWrap");
  wrap.innerHTML = "";
  selected.forEach((q, idx) => {
    const qDiv = document.createElement("div");
    qDiv.className = "border rounded-xl p-4";

    const title = document.createElement("div");
    title.className = "font-semibold mb-2";
    title.textContent = `Câu ${idx+1}. ${q.question}`;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "w-full border rounded-xl px-3 py-2";
    input.placeholder = "Nhập đáp án...";
    input.dataset.qid = q.id;
    input.addEventListener("input", (e) => {
      answers[q.id] = e.target.value;
    });

    const tools = document.createElement("div");
    tools.className = "mt-2 flex items-center gap-3 text-sm";

    const hintBtn = document.createElement("button");
    hintBtn.className = "px-2 py-1 rounded bg-gray-100 hover:bg-gray-200";
    hintBtn.textContent = "Gợi ý";
    const hint = document.createElement("div");
    hint.className = "hint text-gray-600 mt-1";
    hint.innerHTML = `<b>Gợi ý:</b> ${q.hint || "Ôn lại định nghĩa/qui tắc của bài này."}`;
    hintBtn.addEventListener("click", () => hint.classList.toggle("show"));

    const topic = document.createElement("span");
    topic.className = "text-gray-500";
    topic.textContent = `Chủ đề: ${q.topic}`;

    tools.appendChild(hintBtn);
    tools.appendChild(topic);

    qDiv.appendChild(title);
    qDiv.appendChild(input);
    qDiv.appendChild(tools);
    wrap.appendChild(qDiv);
  });
}

// ====== TIMER ======
function startTimer() {
  remain = DURATION_SEC;
  updateTimer();
  timerId = setInterval(() => {
    remain--;
    updateTimer();
    if (remain <= 0) {
      clearInterval(timerId);
      autoSubmit();
    }
  }, 1000);
}
function updateTimer() {
  const m = Math.floor(remain / 60).toString().padStart(2, "0");
  const s = (remain % 60).toString().padStart(2, "0");
  document.getElementById("timer").textContent = `${m}:${s}`;
}

// ====== DRAFT ======
function onSaveDraft() {
  const draft = {
    runId: curStudent.runId,
    name: curStudent.name,
    cls: curStudent.cls,
    remain,
    answers,
    selectedIds: selected.map(q => q.id),
    savedAt: Date.now()
  };
  saveDraft(curStudent.name, curStudent.cls, draft);
  alert("Đã lưu tạm thời trên thiết bị này.");
}

// ====== NỘP BÀI ======
function autoSubmit() {
  alert("Hết giờ! Hệ thống sẽ tự nộp bài.");
  onSubmit(true);
}
async function onSubmit(auto = false) {
  if (!auto) {
    const sure = confirm("Bạn chắc chắn muốn nộp bài?");
    if (!sure) return;
  }
  clearInterval(timerId);

  // Chấm
  let correct = 0;
  const wrongTopics = {};
  selected.forEach(q => {
    const userAns = normalizeAnswer(answers[q.id] || "");
    const trueAns = normalizeAnswer(q.answer);
    const ok = userAns === trueAns;
    if (ok) correct++;
    else {
      wrongTopics[q.topic] = (wrongTopics[q.topic] || 0) + 1;
    }
  });
  const score = correct * 0.25; // 40 câu, mỗi câu 0.25 → thang 10
  const timeTakenSec = Math.max(0, DURATION_SEC - remain);

  // Lưu usedIds
  pushUsedIds(curStudent.name, curStudent.cls, selected.map(q => q.id));
  bumpAttempt(curStudent.name, curStudent.cls);
  clearDraft(curStudent.name, curStudent.cls);

  // Gợi ý: top 3 chủ đề sai nhiều nhất
  const sortedTopics = Object.entries(wrongTopics).sort((a,b)=>b[1]-a[1]).slice(0,3);

  // Gửi về Google Sheets (nếu cấu hình URL)
  const payload = {
    runId: curStudent.runId,
    name: curStudent.name,
    class: curStudent.cls,
    attempt: curStudent.attempt,
    score,
    correct,
    total: QUESTION_COUNT,
    timeTakenSec,
    remainSec: remain,
    selectedIds: selected.map(q => q.id),
    wrongTopics: sortedTopics,
    timestamp: new Date().toISOString()
  };

  try {
    if (SHEET_WEB_APP_URL && SHEET_WEB_APP_URL.startsWith("https://")) {
      await fetch(SHEET_WEB_APP_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }
  } catch (e) {
    console.warn("Gửi Google Sheets lỗi:", e);
  }

  // Hiển thị kết quả
  document.getElementById("examCard").classList.add("hidden");
  document.getElementById("resultCard").classList.remove("hidden");
  document.getElementById("scoreText").textContent = score.toFixed(2);
  document.getElementById("correctCount").textContent = correct;

  const ul = document.getElementById("reviewList");
  ul.innerHTML = "";
  if (sortedTopics.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Bạn làm rất tốt! Vẫn nên ôn tập lại toàn bộ hằng đẳng thức và quy tắc biến đổi cơ bản.";
    ul.appendChild(li);
  } else {
    for (const [topic, nWrong] of sortedTopics) {
      const li = document.createElement("li");
      li.textContent = `${topic} — bạn sai ${nWrong} câu. Ôn lại bài này trước nhé.`;
      ul.appendChild(li);
    }
  }
}

// ====== LÀM LẠI ======
function onRetry() {
  // Reset giao diện về màn hình đăng nhập để sinh 40 câu mới
  document.getElementById("resultCard").classList.add("hidden");
  document.getElementById("loginCard").classList.remove("hidden");
  document.getElementById("examStatus").classList.add("hidden");
  answers = {};
  selected = [];
  remain = DURATION_SEC;
  curStudent.runId = "";
  curStudent.attempt = 1;
  document.getElementById("timer").textContent = "45:00";
}
