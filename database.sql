-- Run this in SQLite if needed
CREATE TABLE alarms (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    dateTime TEXT NOT NULL,
    notifyBefore INTEGER DEFAULT 60,
    createdAt TEXT NOT NULL
);