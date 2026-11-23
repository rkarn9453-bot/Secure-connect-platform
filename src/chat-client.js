require("dotenv").config();
const { io } = require("socket.io-client");

const token = process.env.CHAT_TOKEN;
if (!token) {
  console.error("Set CHAT_TOKEN to a JWT returned by /api/auth/login in your .env file.");
  process.exit(1);
}

const room = process.env.CHAT_ROOM || "general";
const message = process.argv.slice(2).join(" ") || "Hello team, backend is ready!";

const socket = io(`http://localhost:${process.env.PORT || 5000}`, {
  auth: { token }
});

socket.on("connect", () => {
  console.log("[chat-client] Connected:", socket.id);
  socket.emit("join-room", room);
});

socket.on("joined-room", (data) => {
  console.log("[chat-client] Joined room:", data.room);
  socket.emit("chat-message", { room, message });
});

socket.on("chat-message", (data) => {
  console.log(`[${data.room}] ${data.username}: ${data.message}`);
});

socket.on("connect_error", (error) => {
  console.error("[chat-client] Connection failed:", error.message);
  process.exitCode = 1;
  socket.close();
});

setTimeout(() => socket.close(), 5000);
