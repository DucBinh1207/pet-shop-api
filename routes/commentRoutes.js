const express = require("express");
const router = express.Router();
const { client } = require("../db");
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require("../middleware/authenticateToken");

router.post("/comment/add", authenticateToken, async (req, res) => {
    const { id_product, rating, content } = req.body;
    const userId = req.user.userId;

    try {
        await client.connect();
        const db = client.db("PBL6");
        const commentsCollection = db.collection("comments");
        const productsCollection = db.collection("products");

        // Thêm nhận xét mới
        const newComment = {
            _id: uuidv4(),
            userId,
            id_product,
            star: Number(rating),
            content,
            status: 2,
            time: new Date(),
        };

        const result = await commentsCollection.insertOne(newComment);

        if (result.insertedId) {
            // Lấy tất cả các đánh giá hợp lệ
            const validComments = await commentsCollection
                .find({ id_product, status: { $in: [1, 2] } })
                .toArray();

            // Tính trung bình với xử lý số học chính xác
            const totalStars = validComments.reduce((sum, comment) => {
                const starValue = Number(comment.star);
                return sum + (isNaN(starValue) ? 0 : starValue);
            }, 0);

            const averageStar = validComments.length > 0
                ? Number((totalStars / validComments.length).toFixed(1))
                : 0;

            // Cập nhật điểm đánh giá trung bình của sản phẩm
            const updateResult = await productsCollection.updateOne(
                { _id: id_product },
                { $set: { rating: averageStar } }
            );

            if (updateResult.modifiedCount > 0) {
                res.status(201).json();
            } else {
                res.status(201).json();
            }
        } else {
            res.status(400).json();
        }
    } catch (err) {
        console.error("Error adding comment:", err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        await client.close();
    }
});

router.get('/comments/:id_product', async (req, res) => {
    const productId = req.params.id_product;

    try {
        await client.connect();
        const db = client.db("PBL6");
        const commentsCollection = db.collection("comments");
        const usersCollection = db.collection("users");

        // Lấy tất cả các comments có id_product tương ứng từ database
        const comments = await commentsCollection.find({ id_product: productId }).toArray();

        if (comments.length === 0) {
            return res.status(404).json({ message: "No comments found for this product." });
        }

        // Lấy thông tin user tương ứng cho mỗi comment
        const enrichedComments = await Promise.all(comments.map(async (comment) => {
            const user = await usersCollection.findOne({ _id: comment.userId });
            return {
                id: comment._id,
                id_user: user._id,
                email: user.email,
                name: user.name,
                image: user.image,
                star: comment.star,
                content: comment.content,
                time: comment.time
            };
        }));

        // Trả về danh sách comment đã được làm giàu dữ liệu user
        res.status(200).json(enrichedComments);
    } catch (err) {
        console.error("Error fetching comments:", err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        await client.close();
    }
});

module.exports = router;