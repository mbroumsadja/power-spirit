// Serveur Express + Socket.IO + Next.js.
// Rien n'est stocké : le serveur relaie les messages et  en mémoire vive, puis les oublie.
const express = require("express");
const http = require("http");
const next = require("next");
const crypto = require("crypto");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const MAX_FILE_MB = parseInt(process.env.MAX_FILE_MB || "50", 10);
const MAX_FILE = MAX_FILE_MB * 1024 * 1024;
// Les fichiers sont envoyés par morceaux : un gros bloc unique bloque les "ping" de Socket.IO
// et provoque une déconnexion (ping timeout) pendant l'envoi.
const CHUNK_SIZE = 512 * 1024;
// Durée pendant laquelle une adresse IP exclue ne peut pas revenir (0 = pas de blocage)
const KICK_BLOCK_MS = parseInt(process.env.KICK_BLOCK_SECONDS || "30", 10) * 1000;

const app = express();
const server = http.createServer(app);
const nextApp = next({ dev, httpServer: server, port });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const io = new Server(server, {
    maxHttpBufferSize: CHUNK_SIZE * 2 + 64 * 1024, // limite par message : un morceau, pas le fichier entier
    pingInterval: 25000,
    pingTimeout: 60000, // marge pour les connexions lentes
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

  // Remplace une entrée en gardant sa position (le premier de la liste est l'admin)
  const replaceUser = (oldId, newId, value) => {
    const entries = [...users];
    users.clear();
    for (const [id, u] of entries) users.set(id === oldId ? newId : id, id === oldId ? value : u);
  };
  // Relaie un évènement au salon (targetId = null) ou à une personne précise
  const relay = (socket, targetId, event, data) => {
    if (targetId) io.to(targetId).emit(event, data);
    else socket.to("joined").emit(event, data);
  };

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
    const uploads = new Map(); // envois en cours de ce socket : id -> { meta, targetId, received, next }

    socket.on("join", (payload, ack) => {
      ack = typeof ack === "function" ? ack : () => { };
      const until = blocked.get(socket.handshake.address);
      if (until && until > Date.now()) {
        return ack({ ok: false, error: `Tu as été exclu par l'admin. Réessaie dans ${Math.ceil((until - Date.now()) / 1000)} s.` });
      }
      const name = cleanName(payload && payload.name);
      if (!name) return ack({ ok: false, error: "Choisis un pseudo (1 à 20 caractères)." });
      const existing = findIdByName(name);
      if (existing && existing !== socket.id) {
        // Même navigateur qui se reconnecte : l'ancienne connexion est un "fantôme" (coupure réseau,
        // ping timeout...). On la remplace en gardant le pseudo et la place (admin) au lieu de refuser.
        const sidIn = payload && typeof payload.sid === "string" ? payload.sid.slice(0, 64) : "";
        if (!sidIn || users.get(existing).sid !== sidIn) {
          return ack({ ok: false, error: "Ce pseudo est déjà pris, choisis-en un autre." });
        }
        replaceUser(existing, socket.id, { name, sid: sidIn });
        const stale = io.sockets.sockets.get(existing);
        if (stale) { stale.leave("joined"); stale.disconnect(true); }
        socket.join("joined");
        ack({ ok: true, name, maxFileSize: MAX_FILE, chunkSize: CHUNK_SIZE });
        broadcastUsers();
        return;
      }

      const sid = typeof (payload && payload.sid) === "string" ? payload.sid.slice(0, 64) : "";
      const wasIn = users.has(socket.id);
      users.set(socket.id, { name, sid });
      socket.join("joined");
      ack({ ok: true, name, maxFileSize: MAX_FILE, chunkSize: CHUNK_SIZE });
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

    // Envoi de fichier en 3 temps : file:start -> file:chunk (x N) -> file:end.
    // Le serveur relaie chaque morceau tout de suite : rien n'est assemblé ni conservé ici.
    socket.on("file:start", (payload, ack) => {
      ack = typeof ack === "function" ? ack : () => { };
      const me = users.get(socket.id);
      if (!me) return ack({ ok: false, error: "Tu n'es pas connecté." });
      const { name, type, size, to } = payload || {};
      if (!Number.isInteger(size) || size <= 0) return ack({ ok: false, error: "Fichier invalide ou vide." });
      if (size > MAX_FILE) return ack({ ok: false, error: `Fichier trop gros (max ${MAX_FILE_MB} Mo).` });
      if (uploads.size >= 3) return ack({ ok: false, error: "Trop d'envois en même temps." });
      let targetId = null;
      if (to != null) {
        targetId = findIdByName(to);
        if (!targetId || targetId === socket.id) return ack({ ok: false, error: "Cette personne n'est plus connectée." });
      }
      const meta = {
        id: crypto.randomUUID(),
        from: me.name,
        to: targetId ? users.get(targetId).name : null,
        name: String(name || "fichier").slice(0, 200),
        type: String(type || "application/octet-stream").slice(0, 100),
        size,
        ts: Date.now(),
      };
      uploads.set(meta.id, { meta, targetId, received: 0, next: 0 });
      relay(socket, targetId, "file:start", meta);
      ack({ ok: true, uploadId: meta.id });
    });

    socket.on("file:chunk", (payload, ack) => {
      ack = typeof ack === "function" ? ack : () => { };
      const up = uploads.get(payload && payload.uploadId);
      if (!up) return ack({ ok: false, error: "Envoi inconnu ou annulé." });
      const { index, data } = payload;
      const bad = !Buffer.isBuffer(data) || data.length === 0 || data.length > CHUNK_SIZE * 2 || index !== up.next;
      if (bad || up.received + data.length > up.meta.size) {
        uploads.delete(up.meta.id);
        relay(socket, up.targetId, "file:abort", { id: up.meta.id });
        return ack({ ok: false, error: "Morceau de fichier invalide." });
      }
      up.received += data.length;
      up.next += 1;
      relay(socket, up.targetId, "file:chunk", { id: up.meta.id, index, data });
      ack({ ok: true });
    });

    socket.on("file:end", (payload, ack) => {
      ack = typeof ack === "function" ? ack : () => { };
      const up = uploads.get(payload && payload.uploadId);
      if (!up) return ack({ ok: false, error: "Envoi inconnu ou annulé." });
      uploads.delete(up.meta.id);
      if (up.received !== up.meta.size) {
        relay(socket, up.targetId, "file:abort", { id: up.meta.id });
        return ack({ ok: false, error: "Fichier incomplet." });
      }
      if (up.targetId && !users.has(up.targetId)) return ack({ ok: false, error: "Cette personne n'est plus connectée." });
      relay(socket, up.targetId, "file:end", { id: up.meta.id });
      ack({ ok: true, id: up.meta.id, ts: up.meta.ts });
    });

    socket.on("file:cancel", (payload) => {
      const up = uploads.get(payload && payload.uploadId);
      if (!up) return;
      uploads.delete(up.meta.id);
      relay(socket, up.targetId, "file:abort", { id: up.meta.id });
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
      for (const up of uploads.values()) relay(socket, up.targetId, "file:abort", { id: up.meta.id });
      uploads.clear();
      const me = users.get(socket.id);
      if (!me) return;
      users.delete(socket.id);
      broadcastUsers();
      system(socket.data.kicked ? `${me.name} a été exclu par l'admin` : `${me.name} est parti`);
    });
  });

  app.use((req, res) => handle(req, res));

  server.listen(port, "0.0.0.0", () => {
    console.log(`> Prêt sur http://localhost:${port} ( jusqu'à ${MAX_FILE_MB} Mo)`);
  });
});
