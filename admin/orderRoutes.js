const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getClient } = require("../db");
// Middleware để parse JSON body
router.use(express.json());
const { authenticateToken } = require("../middleware/authenticateToken");


router.get("/admin/orders", authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền truy cập
    if (id_role !== 2) { // Chỉ admin được phép truy cập
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    const id_user = req.query.userId || ""; // Lấy id_user từ query (nếu có)
    const status = req.query.status || ""; // Lấy trạng thái từ query (nếu có)
    const sortBy = req.query.sortBy || ""; // Mặc định sắp xếp theo "lastest" nếu không truyền
    const limit = parseInt(req.query.limit, 10) || 10; // Mặc định lấy 10 đơn hàng mỗi trang
    const page = parseInt(req.query.page, 10) || 1; // Mặc định là trang 1

    console.log({ id_user });
    console.log({ status });
    console.log({ sortBy });
    console.log({ limit });
    console.log({ page });

    try {
        const client = getClient();
        const db = client.db("PBL6");
        const ordersCollection = db.collection("orders"); // Truy cập vào collection 'orders'

        // Điều kiện lọc
        let filter = {};
        if (id_user) {
            filter.id_user = id_user;
        }
        if (status) {
            filter.status = parseInt(status, 10); // Lọc theo trạng thái nếu được truyền
        }

        // Điều kiện sắp xếp
        let sortCondition = {};
        if (sortBy === "lastest") {
            sortCondition = { time_created: -1 }; // Sắp xếp theo thời gian giảm dần (mới nhất)
        }

        // Tính toán skip và limit
        const skip = (page - 1) * limit;

        // Tìm kiếm các orders theo filter và sortCondition
        const orders = await ordersCollection
            .find(filter)
            .sort(sortCondition)
            .skip(skip)
            .limit(limit)
            .toArray();

        // Tổng số đơn hàng để tính tổng số trang
        const totalOrders = await ordersCollection.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / limit);

        // Chuẩn bị kết quả trả về
        const completeOrderItems = orders.map(order => ({
            id: order._id.toString(),
            userId: order.id_user,
            name: order.name,
            total_price: order.total_price,
            date_created: order.date,
            status: order.status,
        }));

        res.status(200).json({
            orders: completeOrderItems,
            //totalOrders,
            totalPages,
            currentPage: page,
        }); // Trả về danh sách orders kèm thông tin phân trang
    } catch (error) {
        console.error("Error loading orders:", error); // In ra lỗi nếu có
        res.status(500).json({ message: "Lỗi máy chủ", error });
    } finally {
    }
});




module.exports = router;