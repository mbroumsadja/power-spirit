import Database from "better-sqlite3";

export const db = new Database("chat.db");

function _init() {
  db.exec(
    `
CREATE TABLE file (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_file TEXT NOT NULL,
    sender_name TEXT,
    taille INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
    `
  );
  console.log("La base de donnee et les tables ont été crée avec succes");
}

export default db;
