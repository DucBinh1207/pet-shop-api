const express = require('express');
const router = express.Router();
const { getClient } = require("../db");
// Middleware để parse JSON body
router.use(express.json());
const { authenticateToken } = require("../middleware/authenticateToken");

router.get("/admin/comments", authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền truy cập
    if (id_role !== 2 && id_role !== 3) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    // Lấy giá trị từ query
    const { star, status, userId, limit = 10, page = 1 } = req.query;

    try {
        const client = getClient();
        const db = client.db("PBL6");
        const commentsCollection = db.collection("comments");
        const productsCollection = db.collection("products");
        const usersCollection = db.collection("users");

        // Tạo bộ lọc
        let filter = {};
        if (star !== undefined) {
            const parsedStar = parseInt(star, 10);
            if (isNaN(parsedStar)) {
                return res.status(400).json({ message: "Star phải là một số nguyên hợp lệ" });
            }
            filter.star = parsedStar;
        }
        if (status !== undefined) {
            const parsedStatus = parseInt(status, 10);
            filter.status = parsedStatus;
        }
        if (userId !== undefined) {
            filter.userId = userId;
        }

        // Tính toán phân trang
        const parsedLimit = parseInt(limit, 10);
        const parsedPage = parseInt(page, 10);
        if (isNaN(parsedLimit) || isNaN(parsedPage) || parsedLimit <= 0 || parsedPage <= 0) {
            return res.status(400).json({ message: "Limit và page phải là số nguyên dương hợp lệ" });
        }

        const skip = (parsedPage - 1) * parsedLimit;

        // Tổng số lượng comments
        const totalComments = await commentsCollection.countDocuments(filter);

        // Lấy danh sách comments với phân trang
        const comments = await commentsCollection
            .find(filter)
            .sort({ createdAt: -1 }) // Sắp xếp theo thời gian (mới nhất lên đầu)
            .skip(skip)
            .limit(parsedLimit)
            .toArray();

        // Lấy thông tin product name và user info từ bảng products và users
        const resultComments = await Promise.all(
            comments.map(async (comment) => {
                const product = await productsCollection.findOne({ _id: comment.id_product });
                const user = await usersCollection.findOne({ _id: comment.userId });
                return {
                    id: comment._id,
                    userId: comment.userId,
                    image: user?.image || "null",
                    id_product: comment.id_product,
                    product_name: product?.name || "null",
                    star: comment.star,
                    content: comment.content,
                    status: comment.status,
                    date_created: comment.time,
                };
            })
        );

        res.status(200).json({
            comments: resultComments, // Dữ liệu phân trang
            totalComments, // Tổng số comments
            totalPages: Math.ceil(totalComments / parsedLimit), // Tổng số trang
            currentPage: parsedPage, // Trang hiện tại
        });
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ message: "Lỗi máy chủ. Vui lòng thử lại sau." });
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