// Serveur Express + Socket.IO + Next.js.
// Rien n'est stocké : le serveur relaie les messages et fichiers en mémoire vive, puis les oublie.
const express = require("express");
const http = require("http");
const next = require("next");
const crypto = require("crypto");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const MAX_FILE_MB = parseInt(process.env.MAX_FILE_MB || "50", 10);
const MAX_FILE = MAX_FILE_MB * 1024 * 1024;
// Durée pendant laquelle une adresse IP exclue ne peut pas revenir (0 = pas de blocage)
const KICK_BLOCK_MS = parseInt(process.env.KICK_BLOCK_SECONDS || "30", 10) * 1000;

const app = express();
const server = http.createServer(app);
const nextApp = next({ dev, httpServer: server, port });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const io = new Server(server, {
    maxHttpBufferSize: MAX_FILE + 1024 * 1024,
    destroyUpgrade: false,
  });

  const users = new Map(); // socket.id -> { name } (le premier de la liste est l'admin)
  const blocked = new Map(); // ip -> timestamp de fin de blocage

  const cleanName = (v) => String(v || "").replace(/\s+/g, " ").trim().slice(0, 20);
  const findIdByName = (name) => {
    const n = String(name || "").toLowerCase();
    for (const [id, u] of users) if (u.name.toLowerCase() === n) return id;
    return null;
  };
  const broadcastUsers = () => {
    const list = [...users.values()].map((u, i) => ({ name: u.name, isAdmin: i === 0 }));
    io.to("joined").emit("users", list);
  };
  const system = (text) => io.to("joined").emit("system", { id: crypto.randomUUID(), text, ts: Date.now() });

  // Envoie au salon (to = null) ou à une personne précise. Renvoie false si elle est partie.
  const deliver = (socket, to, event, data) => {
    if (to == null) {
      socket.to("joined").emit(event, data);
      return true;
    }
    const targetId = findIdByName(to);
    if (!targetId || targetId === socket.id) return false;
    data.to = users.get(targetId).name;
    io.to(targetId).emit(event, data);
    return true;
  };

  io.on("connection", (socket) => {
    socket.on("join", (payload, ack) => {
      ack = typeof ack === "function" ? ack : () => { };
      const until = blocked.get(socket.handshake.address);
      if (until && until > Date.now()) {
        return ack({ ok: false, error: `Tu as été exclu par l'admin. Réessaie dans ${Math.ceil((until - Date.now()) / 1000)} s.` });
      }
      const name = cleanName(payload && payload.name);
      if (!name) return ack({ ok: false, error: "Choisis un pseudo (1 à 20 caractères)." });
      const existing = findIdByName(name);
      if (existing && existing !== socket.id) return ack({ ok: false, error: "Ce pseudo est déjà pris, choisis-en un autre." });

      const wasIn = users.has(socket.id);
      users.set(socket.id, { name });
      socket.join("joined");
      ack({ ok: true, name, maxFileSize: MAX_FILE });
      broadcastUsers();
      if (!wasIn) system(`${name} a rejoint le salon`);
    });

    socket.on("message", (payload, ack) => {
      ack = typeof ack === "function" ? ack : () => { };
      const me = users.get(socket.id);
      if (!me) return ack({ ok: false, error: "Tu n'es pas connecté." });
      const text = typeof (payload && payload.text) === "string" ? payload.text.trim().slice(0, 2000) : "";
      if (!text) return ack({ ok: false, error: "Message vide." });
      const msg = { id: crypto.randomUUID(), from: me.name, to: null, text, ts: Date.now() };
      if (!deliver(socket, payload.to, "message", msg)) return ack({ ok: false, error: "Cette personne n'est plus connectée." });
      ack({ ok: true, id: msg.id, ts: msg.ts });
    });

    socket.on("file", (payload, ack) => {
      ack = typeof ack === "function" ? ack : () => { };
      const me = users.get(socket.id);
      if (!me) return ack({ ok: false, error: "Tu n'es pas connecté." });
      const { name, type, data, to } = payload || {};
      if (!Buffer.isBuffer(data) || data.length === 0) return ack({ ok: false, error: "Fichier invalide ou vide." });
      if (data.length > MAX_FILE) return ack({ ok: false, error: `Fichier trop gros (max ${MAX_FILE_MB} Mo).` });
      const msg = {
        id: crypto.randomUUID(),
        from: me.name,
        to: null,
        name: String(name || "fichier").slice(0, 200),
        type: String(type || "application/octet-stream").slice(0, 100),
        size: data.length,
        data,
        ts: Date.now(),
      };
      if (!deliver(socket, to, "file", msg)) return ack({ ok: false, error: "Cette personne n'est plus connectée." });
      ack({ ok: true, id: msg.id, ts: msg.ts });
    });

    // Exclusion : réservée à l'admin (la personne connectée depuis le plus longtemps)
    socket.on("kick", (name, ack) => {
      ack = typeof ack === "function" ? ack : () => { };
      const adminId = users.keys().next().value;
      if (socket.id !== adminId) return ack({ ok: false, error: "Seul l'admin peut exclure quelqu'un." });
      const targetId = findIdByName(name);
      if (!targetId || targetId === socket.id) return ack({ ok: false, error: "Personne à exclure." });
      const target = io.sockets.sockets.get(targetId);
      if (!target) return ack({ ok: false, error: "Cette personne est déjà partie." });
      if (KICK_BLOCK_MS > 0) blocked.set(target.handshake.address, Date.now() + KICK_BLOCK_MS);
      target.data.kicked = true;
      target.emit("kicked");
      target.disconnect(true);
      ack({ ok: true });
    });

    socket.on("disconnect", () => {
      const me = users.get(socket.id);
      if (!me) return;
      users.delete(socket.id);
      broadcastUsers();
      system(socket.data.kicked ? `${me.name} a été exclu par l'admin` : `${me.name} est parti`);
    });
  });

  app.use((req, res) => handle(req, res));

  server.listen(port, "0.0.0.0", () => {
    console.log(`> Prêt sur http://localhost:${port} (fichiers jusqu'à ${MAX_FILE_MB} Mo)`);
  });
});
