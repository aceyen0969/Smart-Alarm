const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("."));

// Initialize Database
const db = new sqlite3.Database("alarms.db");
initDatabase();

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/alarms", (req, res) => {
  db.all(
    "SELECT * FROM alarms ORDER BY datetime(dateTime) ASC",
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    },
  );
});

app.post("/api/alarms", (req, res) => {
  const { id, title, dateTime, notifyBefore, createdAt } = req.body;
  const stmt = db.prepare(
    "INSERT INTO alarms (id, title, dateTime, notifyBefore, createdAt) VALUES (?, ?, ?, ?, ?)",
  );
  stmt.run([id, title, dateTime, notifyBefore, createdAt], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID });
  });
  stmt.finalize();
});

app.delete("/api/alarms/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM alarms WHERE id = ?", [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

function initDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS alarms (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            dateTime TEXT NOT NULL,
            notifyBefore INTEGER DEFAULT 60,
            createdAt TEXT NOT NULL
        )`);
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Mobile: Open this URL on your phone`);
});
