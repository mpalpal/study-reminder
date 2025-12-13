// ===== データ構造 =====
// localStorage["studyLogsV2"] = {
//   "YYYY-MM-DD": {
//     items: [
//       { id, title, body, createdAt, updatedAt }
//     ]
//   }
// }

const STORAGE_KEY = "studyLogsV2";

// ===== Storage =====
function loadAll() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function saveAll(obj) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

// ===== Date helpers =====
function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function dateKeyMinus(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0); // 日付ズレ対策
  d.setDate(d.getDate() - days);
  return formatDateKey(d);
}
function todayKey() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return formatDateKey(d);
}

// ===== CRUD =====
function ensureDay(all, key) {
  if (!all[key]) all[key] = { items: [] };
  if (!Array.isArray(all[key].items)) all[key].items = [];
  return all[key];
}
function getItems(key) {
  const all = loadAll();
  const day = all[key];
  return day?.items ? [...day.items] : [];
}
function upsertItem(key, item) {
  const all = loadAll();
  const day = ensureDay(all, key);
  const idx = day.items.findIndex((x) => x.id === item.id);
  if (idx >= 0) day.items[idx] = item;
  else day.items.unshift(item); // 新しい順
  saveAll(all);
}
function deleteItem(key, id) {
  const all = loadAll();
  const day = ensureDay(all, key);
  day.items = day.items.filter((x) => x.id !== id);
  saveAll(all);
}

// ===== Utils =====
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ===== DOM =====
const $ = (id) => document.getElementById(id);

// pages/tabs
const pageReview = $("pageReview");
const pageRecord = $("pageRecord");
const tabReview = $("tabReview");
const tabRecord = $("tabRecord");

// review: fixed blocks + selectable block + detail
const fixed1Heading = $("fixed1Heading");
const fixed1List = $("fixed1List");
const fixed1Empty = $("fixed1Empty");

const fixed7Heading = $("fixed7Heading");
const fixed7List = $("fixed7List");
const fixed7Empty = $("fixed7Empty");

const fixed14Heading = $("fixed14Heading");
const fixed14List = $("fixed14List");
const fixed14Empty = $("fixed14Empty");

const offsetSelect = $("offsetSelect");
const setToTodayBtn = $("setToTodayBtn");

const reviewHeading = $("reviewHeading");
const reviewList = $("reviewList");
const reviewEmpty = $("reviewEmpty");
const reviewDetail = $("reviewDetail");

// record
const todayLabel = $("todayLabel");
const titleEl = $("title");
const bodyEl = $("body");
const saveBtn = $("saveBtn");
const cancelEditBtn = $("cancelEditBtn");
const msgEl = $("msg");
const todayList = $("todayList");
const todayEmpty = $("todayEmpty");

// backup
const exportBtn = $("exportBtn");
const importFile = $("importFile");
const wipeBtn = $("wipeBtn");
const backupMsg = $("backupMsg");

// ===== Messages =====
function setMsg(text) {
  if (!msgEl) return;
  msgEl.textContent = text;
  if (text) setTimeout(() => (msgEl.textContent = ""), 2000);
}

function setBackupMsg(text) {
  if (!backupMsg) return;
  backupMsg.textContent = text;
  if (text) setTimeout(() => (backupMsg.textContent = ""), 3000);
}

// ===== Routing (#review / #record) =====
function setActiveTab(hash) {
  const isReview = hash !== "#record";
  if (pageReview) pageReview.style.display = isReview ? "" : "none";
  if (pageRecord) pageRecord.style.display = isReview ? "none" : "";
  if (tabReview) tabReview.classList.toggle("active", isReview);
  if (tabRecord) tabRecord.classList.toggle("active", !isReview);
}

window.addEventListener("hashchange", () => {
  setActiveTab(location.hash);
  if (location.hash === "#record") renderRecord();
  else renderReview();
});

// ===== Review page =====
function renderReviewListFor(key, listEl, emptyEl, onSelect) {
  const items = getItems(key);
  listEl.innerHTML = "";

  if (!items.length) {
    emptyEl.style.display = "";
    return;
  }
  emptyEl.style.display = "none";

  for (const it of items) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "list-btn";
    btn.textContent = it.title || "(無題)";
    btn.addEventListener("click", () => onSelect(it, key));
    li.appendChild(btn);
    listEl.appendChild(li);
  }
}

function showReviewDetail(item, label) {
  reviewDetail.classList.remove("muted");
  reviewDetail.innerHTML = `
    <div class="detail-title">${escapeHtml(item.title || "(無題)")}</div>
    <div class="detail-meta muted">${escapeHtml(label)}</div>
    <pre class="pre">${escapeHtml(item.body || "")}</pre>
  `;
}

function labelFor(days, key) {
  if (days === 0) return `今日（${key} / 0日前）`;
  if (days === 1) return `昨日（${key} / 1日前）`;
  if (days === 7) return `1週間前（${key} / 7日前）`;
  if (days === 14) return `2週間前（${key} / 14日前）`;
  return `${key}（${days}日前）`;
}

function renderFixedBlock(days, headingEl, listEl, emptyEl) {
  const key = dateKeyMinus(days);
  const label = labelFor(days, key);
  headingEl.textContent = label;

  renderReviewListFor(key, listEl, emptyEl, (item) => {
    showReviewDetail(item, label);
  });
}

function buildOffsetOptions() {
  offsetSelect.innerHTML = "";
  for (let i = 0; i <= 14; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = i === 0 ? "今日（0日前）" : `${i}日前`;
    offsetSelect.appendChild(opt);
  }
  offsetSelect.value = "0";
}

function renderSelectableBlock() {
  const offset = Number(offsetSelect.value || "0");
  const key = dateKeyMinus(offset);
  const label = labelFor(offset, key);

  reviewHeading.textContent = label;

  renderReviewListFor(key, reviewList, reviewEmpty, (item) => {
    showReviewDetail(item, label);
  });
}

function renderReview() {
  // 固定：昨日 / 7日前 / 14日前
  renderFixedBlock(1, fixed1Heading, fixed1List, fixed1Empty);
  renderFixedBlock(7, fixed7Heading, fixed7List, fixed7Empty);
  renderFixedBlock(14, fixed14Heading, fixed14List, fixed14Empty);

  // 選択：0〜14日前
  renderSelectableBlock();

  // 初期ガイド（内容はクリックで表示）
  reviewDetail.classList.add("muted");
  reviewDetail.textContent = "タイトルをタップすると内容が表示されます";
}

if (offsetSelect) {
  offsetSelect.addEventListener("change", renderSelectableBlock);
}
if (setToTodayBtn) {
  setToTodayBtn.addEventListener("click", () => {
    offsetSelect.value = "0";
    renderSelectableBlock();
  });
}

// ===== Record page (today) =====
const TODAY = todayKey();
if (todayLabel) todayLabel.textContent = `今日：${TODAY}`;

let editingId = null;

function resetForm() {
  editingId = null;
  if (titleEl) titleEl.value = "";
  if (bodyEl) bodyEl.value = "";
  if (cancelEditBtn) cancelEditBtn.style.display = "none";
  if (saveBtn) saveBtn.textContent = "保存";
}

function startEdit(item) {
  editingId = item.id;
  titleEl.value = item.title || "";
  bodyEl.value = item.body || "";
  cancelEditBtn.style.display = "";
  saveBtn.textContent = "更新";
  setMsg("編集モード");
  location.hash = "#record";
}

if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", () => {
    resetForm();
    setMsg("編集をキャンセルしました");
  });
}

function renderRecord() {
  const items = getItems(TODAY);
  todayList.innerHTML = "";
  todayEmpty.style.display = items.length ? "none" : "";

  for (const it of items) {
    const li = document.createElement("li");
    li.className = "list-row";

    const left = document.createElement("button");
    left.type = "button";
    left.className = "list-btn";
    left.textContent = it.title || "(無題)";
    left.addEventListener("click", () => startEdit(it));

    const del = document.createElement("button");
    del.type = "button";
    del.className = "danger";
    del.textContent = "削除";
    del.addEventListener("click", () => {
      if (!confirm("この記録を削除しますか？")) return;
      deleteItem(TODAY, it.id);
      if (editingId === it.id) resetForm();
      renderRecord();
      renderReview(); // 復習側にも反映
      setMsg("削除しました");
    });

    li.appendChild(left);
    li.appendChild(del);
    todayList.appendChild(li);
  }
}

if (saveBtn) {
  saveBtn.addEventListener("click", () => {
    const title = (titleEl.value || "").trim();
    const body = (bodyEl.value || "").trim();

    if (!title) { setMsg("タイトルは必須です"); return; }
    if (!body) { setMsg("内容は必須です"); return; }

    const now = Date.now();
    const existing = editingId ? getItems(TODAY).find(x => x.id === editingId) : null;

    const item = {
      id: editingId || uid(),
      title,
      body,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    upsertItem(TODAY, item);
    renderRecord();
    renderReview();
    resetForm();
    setMsg("保存しました");
  });
}

// ===== Init =====
setActiveTab(location.hash);

// backup: export
function exportJson() {
  const data = loadAll();
  const payload = {
    app: "StudyLog",
    version: 1,
    exportedAt: new Date().toISOString(),
    storageKey: STORAGE_KEY,
    data,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  const stamp = todayKey();
  a.href = url;
  a.download = `study-log-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  setBackupMsg("エクスポートしました（ファイルに保存してください）");
}

if (exportBtn) {
  exportBtn.addEventListener("click", exportJson);
}

// backup: import
function validateImportedPayload(payload) {
  if (!payload || typeof payload !== "object") return { ok: false, error: "JSON形式が不正です" };
  if (!payload.data || typeof payload.data !== "object") return { ok: false, error: "data が見つかりません" };

  // dataの中身が { dateKey: { items:[...] } } っぽいか軽くチェック
  for (const [k, v] of Object.entries(payload.data)) {
    if (typeof k !== "string") return { ok: false, error: "日付キーが不正です" };
    if (!v || typeof v !== "object") return { ok: false, error: "データ構造が不正です" };
    if (!Array.isArray(v.items)) return { ok: false, error: "items 配列が見つかりません" };
  }
  return { ok: true };
}

function importJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || ""));
        const v = validateImportedPayload(payload);
        if (!v.ok) return reject(new Error(v.error));

        // 既存データを上書き（安全のため、事前にエクスポート推奨）
        saveAll(payload.data);
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.readAsText(file);
  });
}

if (importFile) {
  importFile.addEventListener("change", async () => {
    const file = importFile.files && importFile.files[0];
    if (!file) return;

    const ok = confirm("インポートすると、今のデータは上書きされます。続行しますか？\n（不安なら先にエクスポートしてください）");
    if (!ok) {
      importFile.value = "";
      return;
    }

    try {
      await importJsonFile(file);
      setBackupMsg("インポートしました");
      // 画面を再描画
      renderReview();
      renderRecord();
    } catch (e) {
      setBackupMsg(`インポート失敗: ${e.message || e}`);
    } finally {
      importFile.value = "";
    }
  });
}

// backup: wipe
if (wipeBtn) {
  wipeBtn.addEventListener("click", () => {
    const ok = confirm("本当に全データを削除しますか？\n（先にエクスポート推奨）");
    if (!ok) return;

    localStorage.removeItem(STORAGE_KEY);
    setBackupMsg("全削除しました");
    // 画面を再描画
    renderReview();
    renderRecord();
  });
}

// options生成（復習の選択：0〜14日前）
if (offsetSelect) buildOffsetOptions();

// 初回描画
if (location.hash === "#record") renderRecord();
else renderReview();

// Service Worker（キャッシュ用途のみ）
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").catch(console.error);
}