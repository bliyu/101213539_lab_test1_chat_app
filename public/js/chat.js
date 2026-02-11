const token = localStorage.getItem("token");
const username = localStorage.getItem("username");

if (!token || !username) {
  window.location.href = "/view/login.html";
}

document.getElementById("me").textContent = username;

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

function addMsg(container, meta, text) {
  const wrap = document.createElement("div");
  wrap.className = "msg";
  wrap.innerHTML = `<div class="meta">${meta}</div><div>${escapeHtml(text)}</div>`;
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

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
  if (currentRoom) addMsg(roomMessages, "[system]", text);
});

socket.on("roomHistory", (msgs) => {
  roomMessages.innerHTML = "";
  msgs.forEach(m => {
    const time = new Date(m.createdAt).toLocaleString();
    addMsg(roomMessages, `${m.from}  ${time}`, m.text);
  });
});

socket.on("roomMessage", (m) => {
  if (m.room !== currentRoom) return;
  const time = new Date(m.createdAt).toLocaleString();
  addMsg(roomMessages, `${m.from}  ${time}`, m.text);
});

socket.on("privateMessage", (m) => {
  const time = new Date(m.createdAt).toLocaleString();
  const label = (m.from === username) ? `Me -> ${m.to}` : `${m.from} -> Me`;
  addMsg(privateMessages, `${label}  ${time}`, m.text);
});

socket.on("typing", ({ from, isTyping }) => {
  const toUser = privateTo.value;
  if (from !== toUser) return;
  typingStatus.textContent = isTyping ? `${from} is typing...` : "";
});

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
  }, 600);
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.href = "/view/login.html";
});
