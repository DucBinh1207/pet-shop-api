const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Middleware để parse JSON body
router.use(express.json());
const { authenticateToken } = require("../middleware/authenticateToken");
const { getClient } = require("../db");

router.get("/admin/cartItems", authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền truy cập
    if (id_role !== 2) { // Chỉ admin được phép truy cập
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    const id_user = req.query.userId || ""; // Lấy id_user từ query (nếu có)
    const limit = parseInt(req.query.limit, 10) || 10; // Mặc định lấy 10 cart items mỗi trang
    const page = parseInt(req.query.page, 10) || 1; // Mặc định là trang 1

    console.log({ id_user });
    console.log({ limit });
    console.log({ page });

    try {
        const client = getClient();
        const db = client.db("PBL6");
        const cartItemsCollection = db.collection("cart_items"); // Truy cập vào collection 'cart_items'

        // Tạo filter nếu có id_user
        let filter = {};
        if (id_user) {
            filter.id_user = id_user;
        }

        // Tính toán skip và limit
        const skip = (page - 1) * limit;

        // Lấy cart items theo filter và phân trang
        const cartItems = await cartItemsCollection
            .find(filter)
            .skip(skip)
            .limit(limit)
            .toArray();

        // Đếm tổng số cart items (không bị ảnh hưởng bởi skip/limit)
        const totalCartItems = await cartItemsCollection.countDocuments(filter);
        const totalPages = Math.ceil(totalCartItems / limit);

        res.status(200).json({
            cartItems,
            //totalCartItems,
            totalPages,
            currentPage: page,
        }); // Trả về danh sách cart items kèm thông tin phân trang
    } catch (error) {
        console.error("Error loading cart items:", error); // In ra lỗi nếu có
        res.status(500).json({ message: "Lỗi máy chủ", error });
    } finally {
    }
});



module.exports = router;
