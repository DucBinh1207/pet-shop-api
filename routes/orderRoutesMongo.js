const express = require('express');
const router = express.Router();

// Middleware để parse JSON body
router.use(express.json());
const { authenticateToken } = require("../middleware/authenticateToken");
const { getOrder, getOrderDetail, createOrder, getOrderItems,
        webGetOrder, buyNow
 } = require("../controllers/orderController");

// Lấy danh sách đơn hàng của 1 user
router.get('/orders/user', authenticateToken, getOrder);
// Lấy thông tin 1 order của user từ id_order
router.get('/orders/user/detail', authenticateToken, getOrderDetail);
// Đặt hàng
router.post('/orders/create', authenticateToken, createOrder);
// Lấy danh sách order items của 1 order dựa trên id_order
router.get('/orders/user/items', authenticateToken, getOrderItems);
// Web gọi API này để lấy thông tin chi tiết order
router.get('/orders/user/details', authenticateToken, webGetOrder);
// Mua ngay
router.post('/orders/buyNow', authenticateToken, buyNow);

module.exports = router;