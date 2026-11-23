require("dotenv").config();

const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const { connectDB, getDB, closeDB } = require("./config/db");
const authRoutes = require("./routes/auth");
const notesRoutes = require("./routes/notes");
const adminRoutes = require("./routes/admin");
const { authenticateToken } = require("./middleware/auth");
const appEvents = require("./events");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json({ limit: "100kb" }));

app.get("/", (_req, res) => {
  res.json({ message: "Secure Connect API is running", status: "ok" });
});
app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/profile", authenticateToken, async (req, res, next) => {
  try {
    const user = await getDB().collection("users").findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { passwordHash: 0 } }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) { next(error); }
});

app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use((error, _req, res, _next) => {
  console.error("[error]", error);
  res.status(500).json({ message: "Internal server error" });
});

// Socket.IO authentication uses the same JWT created by /api/auth/login.
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication token required"));
    const jwt = require("jsonwebtoken");
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  const username = socket.user.email;
  console.log(`[socket] User connected: ${username}`);

  socket.on("join-room", (roomName) => {
    const room = String(roomName || "general").trim().slice(0, 40);
    socket.join(room);
    socket.emit("joined-room", { room });
    console.log(`[socket] ${username} joined room ${room}`);
  });

  socket.on("chat-message", async (payload = {}) => {
    const room = String(payload.room || "general").trim().slice(0, 40);
    const message = String(payload.message || "").trim().slice(0, 1000);
    if (!message) return;

    const chatMessage = {
      username,
      room,
      message,
      createdAt: new Date()
    };
    try {
      const result = await getDB().collection("messages").insertOne(chatMessage);
      chatMessage.id = result.insertedId.toString();
      io.to(room).emit("chat-message", chatMessage);
      appEvents.emit("chat:message", { username, room, message });
    } catch (error) {
      socket.emit("chat-error", { message: "Message could not be saved" });
      console.error("[socket] Message save failed:", error.message);
    }
  });

  socket.on("disconnect", () => console.log(`[socket] User disconnected: ${username}`));
});

async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("[admin] Optional admin bootstrap skipped (ADMIN_EMAIL/ADMIN_PASSWORD not set)");
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const users = getDB().collection("users");
  const passwordHash = await bcrypt.hash(password, 12);
  await users.updateOne(
    { email: normalizedEmail },
    { $set: { username: process.env.ADMIN_USERNAME || "admin", email: normalizedEmail, passwordHash, role: "admin" },
      $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
  console.log(`[admin] Admin account ready: ${normalizedEmail}`);
}

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
    throw new Error("Set JWT_SECRET in .env to a random string of at least 24 characters");
  }
  await connectDB();
  await ensureAdmin();
  server.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`));
}

start().catch((error) => {
  console.error("[startup] Failed:", error.message);
  process.exit(1);
});

async function shutdown() {
  console.log("\\n[server] shutting down...");
  server.close(async () => {
    await closeDB();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
