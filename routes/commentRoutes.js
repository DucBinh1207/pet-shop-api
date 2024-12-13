const express = require("express");
const router = express.Router();
const { client } = require("../db");
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require("../middleware/authenticateToken");

const { addComment, getComment, deleteComment } = require("../controllers/commentController");


router.post("/comments/add", authenticateToken, addComment);

router.get('/comments/:id_product', getComment);

router.put('/comments/delete', authenticateToken, deleteComment);

module.exports = router;