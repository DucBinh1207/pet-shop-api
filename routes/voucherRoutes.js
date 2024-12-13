const express = require('express');
const router = express.Router();

const { authenticateToken } = require("../middleware/authenticateToken");

// Middleware để parse JSON body
router.use(express.json());

const { applyVoucher } = require("../controllers/voucherController");


// Route để nhận mã voucher và kiểm tra tính hợp lệ
router.get('/voucher/apply/:code', authenticateToken, applyVoucher);


module.exports = router;
