const token = localStorage.getItem("token");
const username = localStorage.getItem("username");

if (!token || !username) {
  window.location.href = "/view/login.html";
}

document.getElementById("me").textContent = username;

// --- Theme (Dark Mode) ---
const themeBtn = document.getElementById("themeBtn");
function setTheme(mode) {
  if (mode === "dark") document.body.classList.add("dark");
  else document.body.classList.remove("dark");
  localStorage.setItem("theme", mode);
  themeBtn.textContent = mode === "dark" ? " Light" : " Dark";
}
setTheme(localStorage.getItem("theme") || "light");
themeBtn.addEventListener("click", () => {
  const next = document.body.classList.contains("dark") ? "light" : "dark";
  setTheme(next);
});

const socket = io();
socket.emit("auth", { token });

const roomSelect = document.getElementById("roomSelect");
const roomStatus = document.getElementById("roomStatus");
const roomMessages = document.getElementById("roomMessages");
const roomInput = document.getElementById("roomInput");

const privateTo = document.getElementById("privateTo");
const privateMessages = document.getElementById("privateMessages");
const privateInput = document.getElementById("privateInput");
const typingStatus = document.getElementById("typingStatus");

let currentRoom = null;
let typingTimeout = null;

async function loadUsers() {
  const res = await fetch("/api/users");
  const users = await res.json();

  privateTo.innerHTML = "";
  users
    .filter(u => u !== username)
    .forEach(u => {
      const opt = document.createElement("option");
      opt.value = u;
      opt.textContent = u;
      privateTo.appendChild(opt);
    });

  if (privateTo.options.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No other users yet";
    privateTo.appendChild(opt);
  }
}
loadUsers();

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function addBubble(container, meta, text, isMe = false) {
  const wrap = document.createElement("div");
  wrap.className = "msg" + (isMe ? " me" : "");
  wrap.innerHTML =
    `<div class="meta">${escapeHtml(meta)}</div>` +
    `<div class="bubble">${escapeHtml(text)}</div>`;
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

// --- Socket events ---
socket.on("authError", ({ message }) => {
  alert(message);
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.href = "/view/login.html";
});

socket.on("rooms", (rooms) => {
  roomSelect.innerHTML = "";
  rooms.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    roomSelect.appendChild(opt);
  });
});

socket.on("onlineUsers", (users) => {
  document.getElementById("onlineUsers").textContent = users.length ? users.join(", ") : "--";
});

socket.on("system", ({ text }) => {
  if (currentRoom) addBubble(roomMessages, "system", text, false);
});

socket.on("roomHistory", (msgs) => {
  roomMessages.innerHTML = "";
  msgs.forEach(m => {
    const time = new Date(m.createdAt).toLocaleString();
    const isMe = m.from === username;
    addBubble(roomMessages, `${m.from}  ${time}`, m.text, isMe);
  });
});

socket.on("roomMessage", (m) => {
  if (m.room !== currentRoom) return;
  const time = new Date(m.createdAt).toLocaleString();
  const isMe = m.from === username;
  addBubble(roomMessages, `${m.from}  ${time}`, m.text, isMe);
});

socket.on("privateMessage", (m) => {
  const time = new Date(m.createdAt).toLocaleString();
  const isMe = m.from === username;
  const label = isMe ? `Me  ${m.to}` : `${m.from}  Me`;
  addBubble(privateMessages, `${label}  ${time}`, m.text, isMe);
});

socket.on("typing", ({ from, isTyping }) => {
  const toUser = privateTo.value;
  if (from !== toUser) return;

  if (isTyping) {
    typingStatus.innerHTML = `${escapeHtml(from)} is typing <span class="dots"><span></span><span></span><span></span></span>`;
  } else {
    typingStatus.textContent = "";
  }
});

// --- UI actions ---
document.getElementById("joinBtn").addEventListener("click", () => {
  const room = roomSelect.value;
  if (!room) return;
  currentRoom = room;
  socket.emit("joinRoom", { room });
  roomStatus.textContent = `In room: ${room}`;
});

document.getElementById("leaveBtn").addEventListener("click", () => {
  if (!currentRoom) return;
  socket.emit("leaveRoom", { room: currentRoom });
  roomStatus.textContent = "Not in a room";
  currentRoom = null;
  roomMessages.innerHTML = "";
});

document.getElementById("sendRoomBtn").addEventListener("click", () => {
  if (!currentRoom) return alert("Join a room first");
  const text = roomInput.value.trim();
  if (!text) return;
  socket.emit("roomMessage", { room: currentRoom, text });
  roomInput.value = "";
});

document.getElementById("sendPrivateBtn").addEventListener("click", () => {
  const to = privateTo.value;
  if (!to) return;
  const text = privateInput.value.trim();
  if (!text) return;

  socket.emit("privateMessage", { to, text });
  privateInput.value = "";
  socket.emit("typing", { to, isTyping: false });
  typingStatus.textContent = "";
});

privateInput.addEventListener("input", () => {
  const to = privateTo.value;
  if (!to) return;

  socket.emit("typing", { to, isTyping: true });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("typing", { to, isTyping: false });
    typingStatus.textContent = "";
  }, 700);
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.href = "/view/login.html";
});
