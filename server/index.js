const path = require("path");
const express = require("express");
const crypto = require("crypto");
const { db, initDb } = require("./db");

const app = express();
app.use(express.json());

initDb();

app.get("/health", (req, res) => res.send("ok"));

// メモ作成
app.post("/api/memos", (req, res) => {
  const { title, body } = req.body || {};
  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }

  const memo = {
    id: crypto.randomUUID(),
    title: title.trim(),
    body: typeof body === "string" ? body : null,
    created_at: Date.now(),
  };

  db.prepare(
    "INSERT INTO memos (id, title, body, created_at) VALUES (@id, @title, @body, @created_at)"
  ).run(memo);

  res.status(201).json(memo);
});

// メモ一覧
app.get("/api/memos", (req, res) => {
  const rows = db
    .prepare("SELECT id, title, body, created_at FROM memos ORDER BY created_at DESC")
    .all();
  res.json(rows);
});

// メモ詳細
app.get("/api/memos/:id", (req, res) => {
  const row = db
    .prepare("SELECT id, title, body, created_at FROM memos WHERE id = ?")
    .get(req.params.id);

  if (!row) return res.status(404).json({ error: "not found" });
  res.json(row);
});

// client 静的配信
const clientDir = path.join(__dirname, "..", "client");
app.use(express.static(clientDir));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`server started: http://localhost:${PORT}`));