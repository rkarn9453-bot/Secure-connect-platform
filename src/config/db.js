const { MongoClient } = require("mongodb");

let client;
let db;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME;

  if (!uri || !dbName) {
    throw new Error("MONGODB_URI and DB_NAME must be set in .env");
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);

  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("notes").createIndex({ ownerId: 1, createdAt: -1 }),
    db.collection("messages").createIndex({ createdAt: -1 })
  ]);

  console.log(`[database] MongoDB connected: ${dbName}`);
  return db;
}

function getDB() {
  if (!db) throw new Error("Database is not connected");
  return db;
}

async function closeDB() {
  if (client) await client.close();
}

module.exports = { connectDB, getDB, closeDB };
