const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const redis = require("redis");
const router = express.Router();
const { client } = require("../db");
const { authenticateToken } = require("../middleware/authenticateToken");

router.post("/add-comment", authenticateToken, async (req, res) => {
  const { id_product, star, content } = req.body;
  const id_user = req.user.id;

  try {
    await client.connect();
    const db = client.db("PBL6");
    const commentsCollection = db.collection("comments");

    const newComment = {
      id_user,
      id_product,
      star,
      content,
      time: new Date(),
    };

    const result = await commentsCollection.insertOne(newComment);

    if (result.insertedId) {
      res.status(201).json({
        message: "Comment added successfully",
        commentId: result.insertedId,
      });
    } else {
      res.status(500).json({ message: "Failed to add comment" });
    }
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    await client.close();
  }
});

module.exports = router;