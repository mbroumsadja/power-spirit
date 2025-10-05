import Database from "better-sqlite3";

export const db = new Database("chat.db");

function _init() {
  db.exec(
    `
CREATE TABLE user (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE room (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    etat TEXT,
    access TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE message (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    content TEXT NOT NULL,
    taille INTEGER,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES user(ID),
    FOREIGN KEY (receiver_id) REFERENCES room(ID)
);
    `
  );
  console.log("La base de donnee et les tables ont été crée avec succes");
}

// ==============================
// USER TABLE HANDLERS
// ==============================
export const userHandlers = {
  // CREATE
create: async (req, res, db) => {
  try {
    const { nom, email } = req.body;
    if (!nom || !email) {
      return res.status(400).json({ error: "Nom and email are required" });
    }
    const stmt = db.prepare("INSERT INTO user (nom, email) VALUES (?, ?)");
    stmt.run(nom, email); 
    res.status(201).json({ 
      ID: db.lastInsertRowid, 
      nom, 
      email 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
},
// DELETE
delete: async (req, res, db) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare("DELETE FROM user WHERE ID = ?");
    stmt.run(id); 
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
},
};

// ==============================
// ROOM TABLE HANDLERS
// ==============================
export const roomHandlers = {
  // CREATE
  create: async (req, res, db) => {
    try {
      const { nom, etat } = req.body;
      if (!nom) {
        return res.status(400).json({ error: "Nom is required" });
      }
      let access = 0
      if(etat === "private"){
          access = parseInt(Math.random()*50000)
          console.log(access, etat === "public")
      }else {
        access = "public"
      }
      console.log(etat)
      const stmt = db.prepare("INSERT INTO room (nom, etat, access) VALUES (?, ?, ?)");
      stmt.run(nom, etat, access); 
      res.status(201).json({ 
        ID: db.lastInsertRowid,
        nom, 
        etat,
        access
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // READ ALL public
  getAll_public: async (req, res, db) => {
    try {
      const stmt = db.prepare("SELECT * FROM room WHERE etat = 'public' ORDER BY created_at DESC");
      const rows = stmt.all();
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

    // READ ALL private
  getAll_private: async (req, res, db) => {
    try {
      const stmt = db.prepare("SELECT * FROM room WHERE etat = 'private' ORDER BY created_at DESC");
      const rows = stmt.all();
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // DELETE
  delete: async (req, res, db) => {
    try {
      const { id } = req.params;
      const stmt = db.prepare("DELETE FROM room WHERE id = ?");
      stmt.run(id);
      res.json({ message: "Room deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

// ==============================
// MESSAGE TABLE HANDLERS
// ==============================
export const messageHandlers = {
  // CREATE
  create: async (req, res, db) => {
    try {
      const { sender_id, receiver_id, content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }
      const taille = Buffer.byteLength(content, "utf8");
      const stmt = db.prepare(
        "INSERT INTO message (sender_id, receiver_id,content, taille) VALUES (?, ?, ?, ?)"
      );
      stmt.run(
        sender_id || null,
        receiver_id || null,
        content,
        taille,
      );  
      res.status(201).json({
        ID: db.lastInsertRowid, 
        sender_id,
        receiver_id,
        content,
        taille
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // READ ALL
  getAll: async (req, res, db) => {
    try {
      const stmt = db.prepare("SELECT * FROM message ORDER BY sent_at DESC");
      const rows = stmt.all();
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // READ BY Receiver_Id
  getByReceiverId: async (req, res, db) => {
    try {
      const { ID } = req.params;
      console.log(ID)
      const stmt = db.prepare("SELECT * FROM message WHERE receiver_id = ? ");
      const row = stmt.all(ID);
      if (!row) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.json(row);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // DELETE
  delete: async (req, res, db) => {
    try {
      const { ID } = req.params;
      const stmt = db.prepare("DELETE FROM message WHERE ID = ?");
      stmt.run(ID); 
      res.json({ message: "Message deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

export default {
  db,
  userHandlers,
  roomHandlers,
  messageHandlers,
};
