const EventEmitter = require("events");

class AppEventBus extends EventEmitter {}
const appEvents = new AppEventBus();

appEvents.on("user:registered", ({ email }) => {
  console.log(`[event] New user registered: ${email}`);
});

appEvents.on("note:created", ({ noteId, ownerId }) => {
  console.log(`[event] Note ${noteId} created by user ${ownerId}`);
});

appEvents.on("chat:message", ({ username, room }) => {
  console.log(`[event] Chat message from ${username} in room ${room}`);
});

module.exports = appEvents;
