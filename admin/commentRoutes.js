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
    console.log("star", star);
    try {
        const client = getClient();
        const db = client.db("PBL6");

        const commentsCollection = db.collection('comments');
        const usersCollection = db.collection('users');
        const productsCollection = db.collection('products');

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

        // Fetch related data for comments
        const userIds = [...new Set(comments.map(comment => comment.userId))];
        const productIds = [...new Set(comments.map(comment => comment.id_product))];

        const users = await usersCollection
            .find({ _id: { $in: userIds } })
            .toArray();
        const products = await productsCollection
            .find({ _id: { $in: productIds } })
            .toArray();

        // Create lookup maps for users and products
        const userMap = users.reduce((map, user) => {
            map[user._id] = user.image; // Chỉ lấy image từ users
            return map;
        }, {});

        const productMap = products.reduce((map, product) => {
            map[product._id] = product.name; // Chỉ lấy name từ products
            return map;
        }, {});

        // Customize the returned fields
        const customizedComments = comments.map(comment => ({
            id: comment._id,
            userId: comment.userId,
            image: userMap[comment.userId] || null, // Lấy image từ bảng users
            idProduct: comment.id_product,
            productName: productMap[comment.id_product] || null, // Lấy name từ bảng products
            star: comment.star,
            content: comment.content,
            status: comment.status,
            dateCreated: comment.time,
        }));
        const totalRecords = customizedComments.length;

        res.status(200).json({
            comments: customizedComments,
            currentPage: page,
            totalPages: Math.ceil(await commentsCollection.countDocuments(filters) / limit),
            totalRecords,
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