const express = require('express');
const router = express.Router();
const { getClient } = require("../db");
// Middleware để parse JSON body
router.use(express.json());
const { authenticateToken } = require("../middleware/authenticateToken");

router.get('/admin/comments', async (req, res) => {
    const { star, userId } = req.query;
    const status = req.query.status ? parseInt(req.query.status) : [0, 1, 2]; // Default to [0, 1, 2] if status is not provided
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;

    try {
        const client = getClient();
        const db = client.db("PBL6");
        const commentsCollection = db.collection('comments');

        // Build filters
        let filters = {};
        if (star) {
            filters.star = parseInt(star);
        }
        if (userId) {
            filters.userId = userId;
        }
        if (Array.isArray(status)) {
            filters.status = { $in: status };
        } else {
            filters.status = status;
        }

        // Fetch comments with pagination
        const comments = await commentsCollection
            .find(filters)
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        // Count total comments for pagination
        const totalComments = await commentsCollection.countDocuments(filters);
        const totalPages = Math.ceil(totalComments / limit);

        res.status(200).json({
            comments,
            currentPage: page,
            totalPages,
            limit
        });
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ message: "Internal Server Error", error });
    }
});

router.put("/admin/comments/status", authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền truy cập
    if (id_role !== 2 && id_role !== 3) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    const { id, status } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!id || status === undefined) {
        console.log("Vui lòng cung cấp đầy đủ id và status");
        return res.status(400).json();
    }

    try {
        const parsedStatus = parseInt(status, 10);
        if (isNaN(parsedStatus)) {
            console.log("Status phải là một số nguyên hợp lệ");
            return res.status(400).json();
        }

        // Kết nối đến MongoDB
        const client = getClient();
        const db = client.db("PBL6");
        const commentsCollection = db.collection("comments");

        // Tìm đơn hàng
        const comment = await commentsCollection.findOne({ _id: id });

        if (!comment) {
            console.log("Không tìm thấy comment với ID đã cung cấp");
            return res.status(400).json();
        }

        // Cập nhật trạng thái đơn hàng
        await commentsCollection.updateOne(
            { _id: id },
            { $set: { status: parsedStatus } }
        );

        res.status(200).json();
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ message: "Lỗi máy chủ. Vui lòng thử lại sau." });
    }
});

module.exports = router;