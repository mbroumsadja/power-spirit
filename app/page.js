"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Logo, { Logomark } from "./components/Logo";
import Icon from "./components/Icon";

const SYSTEM_TTL_MS = 6000; // durée d'affichage des notifications « X a rejoint / est parti »
const EMOJIS = ["🐙", "🦊", "🐸", "🐼", "🦄", "🐯", "🐵", "🦉", "🐳", "🐢", "🦀", "🐝"];
const COLORS = ["#ffd23f", "#ff9f8f", "#7fe3c0", "#b9a8ff", "#8fd3ff", "#ffb3d1"];

function avatarOf(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.codePointAt(0)) >>> 0;
  return { emoji: EMOJIS[h % EMOJIS.length], color: COLORS[(h >> 3) % COLORS.length] };
}
const fmtTime = (ts) => new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
function fmtSize(n) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1)} Mo`;
}

// Identifiant propre à cet onglet : permet de reprendre sa place après une coupure,
// même si le serveur n'a pas encore détecté l'ancienne connexion. (getRandomValues marche aussi en http)
function makeSid() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

function Avatar({ name }) {
  const a = avatarOf(name);
  return <span className="av" style={{ background: a.color }}>{a.emoji}</span>;
}

export default function Home() {
  const socketRef = useRef(null);
  const nameRef = useRef(null);
  const activeRef = useRef("room");
  const urlsRef = useRef([]);
  const endRef = useRef(null);
  const fileInputRef = useRef(null);
  const toastTimer = useRef(null);
  const sidRef = useRef(null);
  const chunkRef = useRef(512 * 1024);
  const incomingRef = useRef(new Map()); // fichiers en cours de réception : id -> { meta, parts }
  const uploadingRef = useRef(false);

  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [me, setMe] = useState("");
  const [maxFile, setMaxFile] = useState(50 * 1024 * 1024);
  const [users, setUsers] = useState([]);
  const [convos, setConvos] = useState({}); // "room" ou "u:<pseudo>" -> messages
  const [unread, setUnread] = useState({});
  const [active, setActive] = useState("room");
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState("");
  const [dragging, setDragging] = useState(false);
  const [upload, setUpload] = useState(null); // { name, pct } pendant un envoi

  const flash = useCallback((text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  }, []);

  const addMessage = useCallback((key, msg) => {
    setConvos((c) => ({ ...c, [key]: [...(c[key] || []), msg] }));
    if (key !== activeRef.current && !msg.mine && msg.kind !== "system") {
      setUnread((u) => ({ ...u, [key]: (u[key] || 0) + 1 }));
    }
  }, []);

  const resetToJoin = useCallback((error = "") => {
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = [];
    nameRef.current = null;
    activeRef.current = "room";
    setJoined(false);
    setConvos({});
    setUnread({});
    setUsers([]);
    setActive("room");
    setJoinError(error);
  }, []);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;
    sidRef.current = makeSid();

    socket.on("connect", () => {
      // Reconnexion automatique après une coupure : on reprend le même pseudo
      if (nameRef.current) {
        socket.emit("join", { name: nameRef.current, sid: sidRef.current }, (res) => {
          if (res.ok) setConnected(true);
          else resetToJoin(res.error);
        });
      } else {
        setConnected(true);
      }
    });
    socket.on("disconnect", () => {
      incomingRef.current.clear(); // réceptions interrompues
      setConnected(false);
    });
    socket.on("users", setUsers);
    socket.on("system", (s) => {
      // Notification éphémère : un doublon remplace le précédent, et tout disparaît après quelques secondes
      setConvos((c) => ({
        ...c,
        room: [...(c.room || []).filter((m) => !(m.kind === "system" && m.text === s.text)), { id: s.id, kind: "system", text: s.text, ts: s.ts }],
      }));
      setTimeout(() => setConvos((c) => ({ ...c, room: (c.room || []).filter((m) => m.id !== s.id) })), SYSTEM_TTL_MS);
    });
    socket.on("message", (m) => {
      const key = m.to == null ? "room" : `u:${m.from}`;
      addMessage(key, { id: m.id, kind: "text", from: m.from, text: m.text, ts: m.ts, mine: false });
    });
    // Réception par morceaux : start -> chunk (x N) -> end
    socket.on("file:start", (meta) => incomingRef.current.set(meta.id, { meta, parts: [] }));
    socket.on("file:chunk", ({ id, data }) => {
      const inc = incomingRef.current.get(id);
      if (inc) inc.parts.push(data);
    });
    socket.on("file:abort", ({ id }) => incomingRef.current.delete(id));
    socket.on("file:end", ({ id }) => {
      const inc = incomingRef.current.get(id);
      if (!inc) return;
      incomingRef.current.delete(id);
      const f = inc.meta;
      const url = URL.createObjectURL(new Blob(inc.parts, { type: f.type }));
      urlsRef.current.push(url);
      const key = f.to == null ? "room" : `u:${f.from}`;
      addMessage(key, {
        id: f.id, kind: "file", from: f.from, ts: f.ts, mine: false,
        file: { name: f.name, type: f.type, size: f.size, url },
      });
    });
    socket.on("kicked", () => resetToJoin("Tu as été exclu par l'admin."));

    return () => {
      socket.disconnect();
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [addMessage, resetToJoin]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [convos, active]);

  const join = (e) => {
    e.preventDefault();
    setJoinError("");
    socketRef.current.emit("join", { name: nameInput, sid: sidRef.current }, (res) => {
      if (!res.ok) return setJoinError(res.error);
      nameRef.current = res.name;
      setMe(res.name);
      setMaxFile(res.maxFileSize);
      if (res.chunkSize) chunkRef.current = res.chunkSize;
      setJoined(true);
    });
  };

  const openConvo = (key) => {
    activeRef.current = key;
    setActive(key);
    setUnread((u) => ({ ...u, [key]: 0 }));
  };

  const target = active === "room" ? null : active.slice(2);
  const targetOnline = target == null || users.some((u) => u.name === target);
  const canSend = connected && targetOnline;
  const iAmAdmin = users.find((u) => u.name === me)?.isAdmin;

  const sendText = () => {
    const text = draft.trim();
    if (!text || !canSend) return;
    const key = active;
    socketRef.current.emit("message", { to: target, text }, (res) => {
      if (!res.ok) return flash(res.error);
      addMessage(key, { id: res.id, kind: "text", from: me, text, ts: res.ts, mine: true });
    });
    setDraft("");
  };

  // Émet un évènement et attend l'accusé de réception (avec délai max)
  const emitAck = (event, payload) =>
    new Promise((resolve) => {
      const s = socketRef.current;
      if (!s || !s.connected) return resolve({ ok: false, error: "Connexion perdue pendant l'envoi." });
      s.timeout(30000).emit(event, payload, (err, res) =>
        resolve(err ? { ok: false, error: "Le serveur ne répond pas." } : res));
    });

  // Envoi par morceaux : le fichier n'est jamais chargé en entier en mémoire et la connexion
  // reste libre pour les "ping" (sinon le serveur coupe la connexion sur les gros fichiers).
  const sendFiles = async (list) => {
    const files = Array.from(list); // à copier tout de suite : la liste est vidée après le onChange
    if (!canSend) return flash("Impossible d'envoyer pour le moment.");
    if (uploadingRef.current) return flash("Un envoi est déjà en cours, patiente un instant.");
    const key = active;
    const to = target;
    uploadingRef.current = true;
    try {
      for (const file of files) {
        if (file.size === 0) { flash(`${file.name} est vide.`); continue; }
        if (file.size > maxFile) { flash(`${file.name} dépasse ${fmtSize(maxFile)}.`); continue; }

        const start = await emitAck("file:start", { to, name: file.name, type: file.type, size: file.size });
        if (!start.ok) { flash(start.error); continue; }

        const chunk = chunkRef.current;
        let failed = false;
        setUpload({ name: file.name, pct: 0 });
        for (let off = 0, index = 0; off < file.size; off += chunk, index++) {
          const data = await file.slice(off, off + chunk).arrayBuffer();
          const r = await emitAck("file:chunk", { uploadId: start.uploadId, index, data });
          if (!r.ok) { flash(r.error); failed = true; break; }
          setUpload({ name: file.name, pct: Math.min(100, Math.round(((off + data.byteLength) / file.size) * 100)) });
        }
        if (failed) {
          socketRef.current?.emit("file:cancel", { uploadId: start.uploadId });
          continue;
        }

        const end = await emitAck("file:end", { uploadId: start.uploadId });
        if (!end.ok) { flash(end.error); continue; }
        const url = URL.createObjectURL(file);
        urlsRef.current.push(url);
        addMessage(key, {
          id: end.id, kind: "file", from: me, ts: end.ts, mine: true,
          file: { name: file.name, type: file.type, size: file.size, url },
        });
      }
    } finally {
      uploadingRef.current = false;
      setUpload(null);
    }
  };

  const kick = (name) => {
    if (!window.confirm(`Exclure ${name} ?`)) return;
    socketRef.current.emit("kick", name, (res) => {
      if (!res.ok) flash(res.error);
    });
  };

  // Personnes parties mais avec qui on a une discussion : on les garde, grisées
  const gone = Object.keys(convos)
    .filter((k) => k.startsWith("u:") && !users.some((u) => `u:${u.name}` === k))
    .map((k) => k.slice(2));

  if (!joined) {
    return (
      <main className="join">
        <form className="join-box" onSubmit={join}>
          <h1 className="brand"><Logo variant="stacked" /></h1>
          <p>Discute et envoie des fichiers. Rien n'est conservé : si tu actualises la page, tout disparaît.</p>
          <label htmlFor="pseudo"><b>Ton pseudo</b></label>
          <input id="pseudo" value={nameInput} maxLength={20} autoFocus autoComplete="off"
            onChange={(e) => setNameInput(e.target.value)} placeholder="Ex. Amina" />
          {joinError && <div className="err" role="alert">{joinError}</div>}
          <button type="submit" disabled={!connected || !nameInput.trim()}>
            {connected ? "Entrer dans le salon" : "Connexion au serveur…"}
          </button>
          <p><small>La première personne connectée devient admin et peut exclure les autres.</small></p>
        </form>
      </main>
    );
  }

  const messages = convos[active] || [];

  return (
    <div className="app">
      <header className="top">
        <h1 className="brand"><Logo variant="horizontal" /></h1>
        <span className="grow" />
        <span className="pill">{me}{iAmAdmin ? " · admin" : ""}</span>
        <span className={`pill ${connected ? "" : "off"}`}>{connected ? "en ligne" : "reconnexion…"}</span>
      </header>

      <div className="body">
        <aside className="side">
          <h2>Connectés ({users.length})</h2>
          <button className={`chan ${active === "room" ? "active" : ""}`} onClick={() => openConvo("room")}>
            <span className="av" style={{ background: "#fff" }}><Icon name="home" /></span>
            <span className="label">Salon général</span>
            {unread.room > 0 && <span className="badge">{unread.room}</span>}
          </button>
          <ul>
            {users.filter((u) => u.name !== me).map((u) => (
              <li key={u.name} className="row">
                <button className={`chan ${active === `u:${u.name}` ? "active" : ""}`} onClick={() => openConvo(`u:${u.name}`)}>
                  <Avatar name={u.name} />
                  <span className="label">{u.name}</span>
                  {u.isAdmin && <span className="tag">admin</span>}
                  {unread[`u:${u.name}`] > 0 && <span className="badge">{unread[`u:${u.name}`]}</span>}
                </button>
                {iAmAdmin && <button className="kick" onClick={() => kick(u.name)} title={`Exclure ${u.name}`}>Exclure</button>}
              </li>
            ))}
            {gone.map((name) => (
              <li key={name} className="row">
                <button className={`chan gone ${active === `u:${name}` ? "active" : ""}`} onClick={() => openConvo(`u:${name}`)}>
                  <Avatar name={name} />
                  <span className="label">{name} (parti)</span>
                </button>
              </li>
            ))}
          </ul>
          {users.length <= 1 && <p><small>Tu es seul pour l'instant. Partage l'adresse de cette page sur ton réseau.</small></p>}
        </aside>

        <main
          className={`thread ${dragging ? "drag" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) sendFiles(e.dataTransfer.files); }}
        >
          <div className="thread-head">
            {target == null ? <><Icon name="home" /> Salon général</> : <><Avatar name={target} /> {target}</>}
            {!targetOnline && <small>Cette personne est partie.</small>}
          </div>

          <div className="msgs">
            {messages.length === 0 && (
              <div className="empty">
                <Logomark mood="sleep" size={96} />
                <p><b>C'est calme ici.</b></p>
                <p>Écris un message ou glisse un fichier dans cette zone.</p>
              </div>
            )}
            {messages.map((m) =>
              m.kind === "system" ? (
                <div key={m.id} className="sys">{m.text}</div>
              ) : (
                <div key={m.id} className={`msg ${m.mine ? "mine" : ""}`}>
                  <div className="meta"><span>{m.mine ? "Moi" : m.from}</span><span>{fmtTime(m.ts)}</span></div>
                  {m.kind === "text" ? (
                    <div className="text">{m.text}</div>
                  ) : (
                    <div className="file">
                      <div className="info"><span className="av" style={{ background: "#fff" }}><Icon name="file" /></span>
                        <span><b>{m.file.name}</b><br /><small>{fmtSize(m.file.size)}</small></span>
                      </div>
                      {m.file.type.startsWith("image/") && <img src={m.file.url} alt={m.file.name} />}
                      <a href={m.file.url} download={m.file.name}><Icon name="download" /> Télécharger</a>
                    </div>
                  )}
                </div>
              )
            )}
            <div ref={endRef} />
          </div>

          {upload && (
            <div className="upload" role="status">
              <span><Icon name="upload" /> {upload.name} — {upload.pct} %</span>
              <div className="bar"><div style={{ width: `${upload.pct}%` }} /></div>
            </div>
          )}

          <div className="composer">
            <input ref={fileInputRef} type="file" multiple hidden
              onChange={(e) => { sendFiles(e.target.files); e.target.value = ""; }} />
            <button onClick={() => fileInputRef.current.click()} disabled={!canSend} aria-label="Joindre un fichier"><Icon name="paperclip" /><span className="btn-label">Fichier</span></button>
            <textarea
              rows={1} value={draft} placeholder={canSend ? "Écris un message…" : "Envoi impossible"} disabled={!canSend}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
            />
            <button onClick={sendText} disabled={!canSend || !draft.trim()} aria-label="Envoyer le message"><Icon name="send" /><span className="btn-label">Envoyer</span></button>
          </div>
        </main>
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
