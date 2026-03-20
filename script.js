const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("."));

// Fix sqlite3 for Render/Heroku
const dbPath = path.join("/tmp", "alarms.db"); // Use tmp folder
const db = new sqlite3.Database(dbPath);

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/alarms", (req, res) => {
  db.all(
    "SELECT * FROM alarms ORDER BY datetime(dateTime) ASC",
    (err, rows) => {
      if (err) {
        console.error("DB Error:", err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows || []);
    },
  );
});

app.post("/api/alarms", (req, res) => {
  const { id, title, dateTime, notifyBefore, createdAt } = req.body;
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO alarms (id, title, dateTime, notifyBefore, createdAt) VALUES (?, ?, ?, ?, ?)",
  );
  stmt.run([id, title, dateTime, notifyBefore, createdAt], function (err) {
    if (err) {
      console.error("Insert Error:", err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, success: true });
  });
  stmt.finalize();
});

app.delete("/api/alarms/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM alarms WHERE id = ?", [id], function (err) {
    if (err) {
      console.error("Delete Error:", err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes, success: true });
  });
});

// Initialize Database
function initDatabase() {
  console.log("🗄️ Initializing database...");
  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS alarms (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            dateTime TEXT NOT NULL,
            notifyBefore INTEGER DEFAULT 60,
            createdAt TEXT NOT NULL
        )`,
      (err) => {
        if (err) {
          console.error("Table creation error:", err);
        } else {
          console.log("✅ Database ready!");
        }
      },
    );
  });
}

// Fix sqlite3 prebuilds for Render
if (os.platform() === "linux") {
  process.env.SQLITE3_BINARY_SITE =
    "https://github.com/TryGhost/node-sqlite3/releases/";
}

initDatabase();

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Live URL: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing server");
  server.close(() => {
    db.close();
    process.exit(0);
  });
});
