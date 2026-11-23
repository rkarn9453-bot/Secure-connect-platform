const express = require("express");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const { authenticateToken, validObjectId } = require("../middleware/auth");
const appEvents = require("../events");

const router = express.Router();
router.use(authenticateToken);

router.post("/", async (req, res, next) => {
  try {
    const { title, content } = req.body || {};
    if (!title || !content) return res.status(400).json({ message: "title and content are required" });

    const note = {
      title: String(title).trim(),
      content: String(content),
      ownerId: new ObjectId(req.user.id),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const result = await getDB().collection("notes").insertOne(note);
    note._id = result.insertedId;
    appEvents.emit("note:created", { noteId: result.insertedId.toString(), ownerId: req.user.id });
    return res.status(201).json({ message: "Note created", note });
  } catch (error) {
    next(error);
  }       
});

router.get("/", async (req, res, next) => {
  try {
    const notes = await getDB().collection("notes")
      .find({ ownerId: new ObjectId(req.user.id) })
      .sort({ createdAt: -1 }).toArray();
    res.json(notes);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) return res.status(400).json({ message: "Invalid note id" });
    const note = await getDB().collection("notes").findOne({
      _id: new ObjectId(req.params.id),
      ownerId: new ObjectId(req.user.id)
    });
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json(note);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) return res.status(400).json({ message: "Invalid note id" });
    const { title, content } = req.body || {};
    if (!title || !content) return res.status(400).json({ message: "title and content are required" });

    const result = await getDB().collection("notes").findOneAndUpdate(
      { _id: new ObjectId(req.params.id), ownerId: new ObjectId(req.user.id) },
      { $set: { title: String(title).trim(), content: String(content), updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!result) return res.status(404).json({ message: "Note not found" });
    res.json({ message: "Note updated", note: result });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) return res.status(400).json({ message: "Invalid note id" });
    const result = await getDB().collection("notes").deleteOne({
      _id: new ObjectId(req.params.id),
      ownerId: new ObjectId(req.user.id)
    });
    if (!result.deletedCount) return res.status(404).json({ message: "Note not found" });
    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
