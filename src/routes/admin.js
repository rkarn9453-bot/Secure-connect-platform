const express = require("express");
const { getDB } = require("../config/db");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken, requireRole("admin"));

router.get("/users", async (req, res, next) => {
  try {
    const users = await getDB().collection("users")
      .find({}, { projection: { passwordHash: 0 } })
      .sort({ createdAt: -1 }).toArray();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
