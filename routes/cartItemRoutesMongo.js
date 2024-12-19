const express = require('express');
const router = express.Router();

// Middleware để parse JSON body
router.use(express.json());
const { authenticateToken } = require("../middleware/authenticateToken");
const { client } = require("../db");
const {
    checkReservedStock
} = require("../product/product");

const { addToCart, getCartItems, getCartItemsMobile, 
    updateCart, deleteCartItems, verifyCart, verifyCart2 } = require("../controllers/cartItemsController");

// Route để thêm sản phẩm vào giỏ hàng
router.post('/cartItem/add', authenticateToken, addToCart);
// Route load sản phẩm giỏ hàng của 1 user
router.get("/cartItems", authenticateToken, getCartItems);
// Route get cart items cho mobile
router.get("/cartItems/mobile", authenticateToken, getCartItemsMobile);
// Route để cập nhật giỏ hàng
router.put('/cartItems/update', authenticateToken, updateCart);
//Web gọi api này khi muốn delete 1 sp trong giỏ
router.put('/cartItems/delete', authenticateToken, deleteCartItems);
//Route check sản phẩm có hợp lệ trc khi chuyển qua thanh toán
router.post("/cartItems/verify2", authenticateToken, verifyCart2);

router.get("/cartItems/verify", authenticateToken, verifyCart);
//Route check stock (ko cần dùng)
router.get("/cartItems/checkStock", authenticateToken, async (req, res) => {
    const userId = req.user.userId; // Lấy id_user từ token
    try {
        // Nếu kiểm tra thành công, giữ hàng trong Redis
        const checkReserveStock = await checkReservedStock(userId);
        if (!checkReserveStock.success) {
            console.log("Lỗi giữ hàng");
            return res.status(400).json({
                success: false,
                message: checkReserveStock.message,
            });
        }

        // Nếu tất cả đều hợp lệ, trả về thành công
        res.status(200).json({
            success: true,
            message: checkReserveStock.data,
        });

    } catch (error) {
        console.error('Error loading cart items:', error); // In ra lỗi nếu có
        res.status(500).json({
            success: false,
            message: "Lỗi máy chủ",
            error,
        });
    }
});

module.exports = router;