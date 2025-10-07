import Database from "better-sqlite3";

export const db = new Database("chat.db");

function _init() {
  db.exec(
    `
CREATE TABLE room (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    etat TEXT,
    access TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE message (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    receiver_id INTEGER,
    content TEXT NOT NULL,
    taille INTEGER,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (receiver_id) REFERENCES room(ID)
);
    `
  );
  console.log("La base de donnee et les tables ont été crée avec succes");
}

export default db