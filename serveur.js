import express from "express";
import path from "node:path";
import favicon from "serve-favicon";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { fileURLToPath } from "node:url";
import db from "./database/db.js";
import multer from "multer";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const Port = 3000;
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

//creation automatique tu repertoire uploads
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Générer un nom unique : timestamp-random-nom_original
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${uniqueSuffix}-${name}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    // Types autorisés
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|mp3|mp4/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Type de fichier non autorisé"));
    }
  },
});

// Route pour l'upload de fichier
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier reçu" });
  }

  const fileUrl = `/${req.file.filename}`;
  const username = req.body.username || "Anonyme";

  let stmt = db.prepare(
    `INSERT INTO file ( name_file ,sender_name, taille) VALUES(?,?,?)`
  );
  stmt.run(req.file.filename, username, req.file.size);
  console.log("enregistrer dans la base de donnee");
  // Envoyer les infos du fichier à tous les clients via Socket.IO

  io.emit("file", {
    username: username,
    filename: req.file.originalname,
    fileUrl: fileUrl,
    filetype: req.file.mimetype,
    filesize: req.file.size,
    timestamp: new Date().toLocaleTimeString(),
  });
  io.emit("historique", {
    username: username,
    filename: req.file.originalname,
    fileUrl: fileUrl,
    filetype: req.file.mimetype,
    filesize: req.file.size,
    timestamp: new Date().toLocaleTimeString(),
  });
  res.json({
    success: true,
    fileUrl: fileUrl,
    filename: req.file.originalname,
  });
});

app.use(favicon(path.join(__dirname, "favicon.ico")));
app.use("/static", express.static(path.join(__dirname, "public")));
app.use("/file", express.static(path.join(__dirname, "uploads")));
app.use(express.json());

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/file", async (req, res) => {
  let stmt = db.prepare(`SELECT * FROM file`);
  const data = stmt.all();

  for (let maps of data) {
    io.emit("historique", {
      username: maps.sender_name,
      filename: maps.name_file,
      filesize: maps.taille,
      timestamp: maps.created_at,
    });
  }

  res.send({
    success: true,
    data,
  });
});

function getUserCount() {
  return io.engine.clientsCount;
}

// Fonction pour émettre le nombre d'utilisateurs à tous
function broadcastUserCount() {
  io.emit("user-count", getUserCount());
}
io.on("connection", (socket) => {
  // Envoyer le nombre d'utilisateurs à tous
  broadcastUserCount();
  // Recevoir un message du client
  socket.on("message", (data) => {
    console.log("Message reçu:", data);

    // Redistribuer le message à TOUS les clients (y compris l'émetteur)
    io.emit("message", {
      username: data.username,
      text: data.text,
      timestamp: new Date().toLocaleTimeString(),
    });
  });
  socket.on("file", (data) => {
    console.log("Fichier reçu:", data.filename);

    io.emit("file", {
      username: data.username,
      filename: data.filename,
      filedata: data.filedata,
      filetype: data.filetype,
      timestamp: new Date().toLocaleTimeString(),
    });
  });
  // Déconnexion
  socket.on("disconnect", (socket) => {
    console.log("Un utilisateur s'est déconnecté");
  });
  broadcastUserCount();
});

server.listen(Port, () => {
  console.log("Le serveur tourne sur le port " + Port);
});
