// api/alarms.js - Vercel Serverless API
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(process.cwd(), "alarms.db");
const db = new sqlite3.Database(dbPath);

export default async function handler(req, res) {
  // Init DB
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS alarms (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      dateTime TEXT NOT NULL,
      notifyBefore INTEGER DEFAULT 60,
      createdAt TEXT NOT NULL
    )`);
  });

  if (req.method === "GET") {
    db.all(
      "SELECT * FROM alarms ORDER BY datetime(dateTime) ASC",
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
      },
    );
  } else if (req.method === "POST") {
    const { id, title, dateTime, notifyBefore, createdAt } = req.body;
    db.run(
      "INSERT OR REPLACE INTO alarms (id, title, dateTime, notifyBefore, createdAt) VALUES (?, ?, ?, ?, ?)",
      [id, title, dateTime, notifyBefore, createdAt],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      },
    );
  } else if (req.method === "DELETE") {
    const id = req.query.id;
    db.run("DELETE FROM alarms WHERE id = ?", [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
