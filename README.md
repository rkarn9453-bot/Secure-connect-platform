# Lab 4 – Secure Connect and Communication Platform

**Course:** Web Dev III | **Unit:** 4

A Node.js + Express backend demonstrating password hashing, JWT authentication, protected routes, role-based access control, MongoDB-backed Notes CRUD, Socket.IO chat, and Node.js EventEmitter events.

## 1. Requirements

- Node.js 18 or newer
- MongoDB running locally, or a MongoDB connection URI
- VS Code (recommended)

## 2. Setup in VS Code

1. Extract/open this folder in VS Code.
2. Open the VS Code terminal (`Terminal > New Terminal`).
3. Install dependencies:

   ```bash
   npm install
   ```

4. Copy `.env.example` to a new file named `.env`.
5. Set `JWT_SECRET` to a long random secret (at least 24 characters). Confirm `MONGODB_URI` and `DB_NAME`.
6. Make sure MongoDB is running.
7. Start the server:

   ```bash
   npm run dev
   ```

   Or use `npm start`.

Expected startup output:

```text
[database] MongoDB connected: secure_connect_lab4
[admin] Admin account ready: admin@example.com
[server] listening on http://localhost:5000
```

The admin line appears only when the optional admin variables are configured.

## 3. API endpoints

Base URL: `http://localhost:5000`

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/` | Public | Health check |
| POST | `/api/auth/signup` | Public | Register a user |
| POST | `/api/auth/login` | Public | Login and receive JWT |
| GET | `/api/profile` | JWT | Get logged-in user's profile |
| POST | `/api/notes` | JWT | Create a note |
| GET | `/api/notes` | JWT | List only your notes |
| GET | `/api/notes/:id` | JWT | Get one of your notes |
| PUT | `/api/notes/:id` | JWT | Update one of your notes |
| DELETE | `/api/notes/:id` | JWT | Delete one of your notes |
| GET | `/api/admin/users` | Admin JWT | List users (without password hashes) |

### Signup

`POST /api/auth/signup` – JSON body:

```json
{
  "username": "victor",
  "email": "victor@example.com",
  "password": "Pass12345"
}
```

### Login

`POST /api/auth/login` – JSON body:

```json
{
  "email": "victor@example.com",
  "password": "Pass12345"
}
```

Copy the returned token. For protected endpoints, set this header:

```text
Authorization: Bearer YOUR_JWT_TOKEN
```

### Create note

`POST /api/notes` – JSON body:

```json
{
  "title": "My First Note",
  "content": "This is my first note for Web Dev III"
}
```

Use `GET /api/notes` to see your notes. Use the returned `_id` in the `GET`, `PUT`, and `DELETE` URLs.

## 4. Real-time chat (Socket.IO)

The Socket.IO server runs on the same port as Express. Connect a Socket.IO client with the JWT from login:

```javascript
const socket = io("http://localhost:5000", {
  auth: { token: "YOUR_JWT_TOKEN" }
});

socket.emit("join-room", "general");
socket.on("joined-room", ({ room }) => console.log("Joined:", room));

socket.emit("chat-message", {
  room: "general",
  message: "Hello team, backend is ready!"
});

socket.on("chat-message", (data) => console.log(data));
```

A small test client is included. Add your login JWT to `.env` as `CHAT_TOKEN=...`, then run:

```bash
npm run chat:test
```

You can pass a custom message with `npm run chat:test -- "Hello from my client"`. Open two terminals and run the client twice to see messages exchanged in the same room.

## 5. Event-driven features

`src/events.js` creates a Node.js `EventEmitter` instance. The application emits and logs:

- `user:registered` after successful signup
- `note:created` after a note is created
- `chat:message` after a chat message is stored

## 6. Security implemented

- Passwords are hashed with bcrypt (12 salt rounds); plaintext passwords are never stored.
- JWTs are signed and verified using `JWT_SECRET`.
- Protected routes reject missing, invalid, or expired tokens.
- New public signups always receive the `user` role; clients cannot choose `admin`.
- Admin-only user listing uses RBAC.
- Notes are scoped to the authenticated user's MongoDB ID, preventing access to another user's notes.
- Input is checked for required fields and note IDs.
- `.env` is ignored by Git; never commit real secrets.

## 7. Postman testing order

Import `postman/Lab4-Secure-Connect.postman_collection.json` into Postman. Run signup, login, then copy the login token into the collection variable `token`. Test the protected profile and Notes requests. Test the no-token case by removing the Authorization header; it should return `401`.

## 8. Assignment checklist

- [x] Signup and Login System
- [x] bcrypt password hashing and verification
- [x] JWT authentication
- [x] Protected routes
- [x] Role-Based Access Control (admin/user)
- [x] Secure Notes API with CRUD
- [x] Real-time chat using Socket.IO
- [x] Event-driven features using EventEmitter
- [x] Environment variables using dotenv
- [x] MongoDB persistence
- [x] Postman collection and setup documentation

**Note:** The checklist represents implemented project code. Run the project and test each endpoint/chat flow on your machine before submitting; screenshots should show your actual successful run.
