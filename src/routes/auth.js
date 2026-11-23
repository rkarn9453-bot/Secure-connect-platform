const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const appEvents = require("../events");

const router = express.Router();
const SALT_ROUNDS = 12;

router.post("/signup", async (req, res, next) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email and password are required" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const users = getDB().collection("users");
    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const user = {
      username: String(username).trim(),
      email: normalizedEmail,
      passwordHash,
      role: "user",
      createdAt: new Date()
    };
    const result = await users.insertOne(user);

    appEvents.emit("user:registered", { email: normalizedEmail });
    return res.status(201).json({
      message: "User registered",
      id: result.insertedId,
      username: user.username,
      email: user.email
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Email already registered" });
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "email and password are required" });

    const user = await getDB().collection("users")
      .findOne({ email: String(email).trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(String(password), user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { subject: user._id.toString(), expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
