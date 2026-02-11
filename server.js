require("dotenv").config();
const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const User = require("./models/User");
const RoomMessage = require("./models/RoomMessage");
const PrivateMessage = require("./models/PrivateMessage");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/view", express.static(path.join(__dirname, "view")));

app.use("/api/auth", authRoutes);

app.get("/api/users", async (req, res) => {
  const users = await User.find({}, { username: 1, _id: 0 }).sort({ username: 1 });
  res.json(users.map(u => u.username));
});

app.get("/", (req, res) => res.redirect("/view/login.html"));

async function start() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("? MongoDB connected");

  server.listen(process.env.PORT || 3000, () => {
    console.log(`? Server running: http://localhost:${process.env.PORT || 3000}`);
  });
}

function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

const online = new Map();

function addOnline(username, socketId) {
  if (!online.has(username)) online.set(username, new Set());
  online.get(username).add(socketId);
}

function removeOnline(username, socketId) {
  if (!online.has(username)) return;
  const set = online.get(username);
  set.delete(socketId);
  if (set.size === 0) online.delete(username);
}

function getAnySocketId(username) {
  const set = online.get(username);
  if (!set || set.size === 0) return null;
  return [...set][0];
}

function broadcastOnlineUsers() {
  io.emit("onlineUsers", [...online.keys()].sort());
}

const ROOMS = ["devops", "cloud computing", "covid19", "sports", "nodeJS"];

io.on("connection", (socket) => {
  socket.on("auth", async ({ token }) => {
    const decoded = verifyToken(token);
    if (!decoded?.username) {
      socket.emit("authError", { message: "Invalid token. Please login again." });
      return;
    }
    socket.username = decoded.username;
    addOnline(socket.username, socket.id);

    socket.emit("rooms", ROOMS);
    broadcastOnlineUsers();
    console.log(`?? ${socket.username} connected (${socket.id})`);
  });

  socket.on("joinRoom", async ({ room }) => {
    if (!socket.username) return;
    if (!room) return;

    if (socket.currentRoom) socket.leave(socket.currentRoom);

    socket.currentRoom = room;
    socket.join(room);

    const recent = await RoomMessage.find({ room })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    socket.emit("roomHistory", recent.reverse());
    socket.to(room).emit("system", { text: `${socket.username} joined ${room}` });
  });

  socket.on("leaveRoom", ({ room }) => {
    if (!socket.username) return;
    const r = room || socket.currentRoom;
    if (!r) return;
    socket.leave(r);
    socket.to(r).emit("system", { text: `${socket.username} left ${r}` });
    if (socket.currentRoom === r) socket.currentRoom = null;
  });

  socket.on("roomMessage", async ({ room, text }) => {
    if (!socket.username) return;
    if (!room || !text?.trim()) return;

    const msg = await RoomMessage.create({
      room,
      from: socket.username,
      text: text.trim()
    });

    io.to(room).emit("roomMessage", {
      room,
      from: msg.from,
      text: msg.text,
      createdAt: msg.createdAt
    });
  });

  socket.on("privateMessage", async ({ to, text }) => {
    if (!socket.username) return;
    if (!to || !text?.trim()) return;

    const msg = await PrivateMessage.create({
      from: socket.username,
      to,
      text: text.trim()
    });

    socket.emit("privateMessage", {
      from: msg.from,
      to: msg.to,
      text: msg.text,
      createdAt: msg.createdAt
    });

    const receiverSocketId = getAnySocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("privateMessage", {
        from: msg.from,
        to: msg.to,
        text: msg.text,
        createdAt: msg.createdAt
      });
    }
  });

  socket.on("typing", ({ to, isTyping }) => {
    if (!socket.username) return;
    if (!to) return;
    const receiverSocketId = getAnySocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { from: socket.username, isTyping: !!isTyping });
    }
  });

  socket.on("disconnect", () => {
    if (socket.username) {
      removeOnline(socket.username, socket.id);
      broadcastOnlineUsers();
      console.log(`? ${socket.username} disconnected (${socket.id})`);
    }
  });
});

start().catch((e) => {
  console.error("? Failed to start server:", e.message);
  process.exit(1);
});
