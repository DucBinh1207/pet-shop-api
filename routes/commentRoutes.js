const express = require("express");
const router = express.Router();
const { client } = require("../db");
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require("../middleware/authenticateToken");

const { addComment, getComment, deleteComment, getTopComment, getCommentMobile } = require("../controllers/commentController");


router.post("/comments/add", authenticateToken, addComment);

router.get('/comments', getComment);

router.put('/comments/delete', authenticateToken, deleteComment);

router.get('/comments/topComments', getTopComment);

router.get('/comments/mobile/:id_product', getCommentMobile);
module.exports = router;