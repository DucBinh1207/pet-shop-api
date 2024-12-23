const express = require('express');
const { getClient } = require("../db");
const router = express.Router();
const { authenticateToken } = require("../middleware/authenticateToken");

// Route to get dashboard statistics
router.get('/admin/dashboard/summary', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền admin
    if (id_role !== 2 && id_role !== 3) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    try {
        console.log('Getting dashboard statistics');
        const client = getClient();
        const db = client.db("PBL6");
        const ordersCollection = db.collection("orders");
        const productsCollection = db.collection("products");
        const usersCollection = db.collection("users");

        // Get total orders
        const totalOrders = await ordersCollection.countDocuments();

        // Get total revenue
        const orders = await ordersCollection.find().toArray();
        const totalRevenue = orders.reduce((acc, order) => acc + parseInt(order.total_price, 10), 0);

        // Get total products
        const totalProducts = await productsCollection.countDocuments();

        // Get total users
        const totalUsers = await usersCollection.countDocuments();

        res.status(200).json({
            totalOrders,
            totalRevenue,
            totalProducts,
            totalUsers
        });
    } catch (error) {
        console.error("Error getting dashboard statistics:", error);
        res.status(500).json({ message: "Internal Server Error", error });
    }
});

module.exports = router;