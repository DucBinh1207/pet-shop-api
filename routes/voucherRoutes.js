const express = require('express');
const router = express.Router();

const { client } = require("../db");
const { authenticateToken } = require("../middleware/authenticateToken");

// Middleware để parse JSON body
router.use(express.json());

// Route để nhận mã voucher và kiểm tra tính hợp lệ
router.get('/voucher/apply/:code', authenticateToken, async (req, res) => {
    const { code } = req.params; // Lấy code từ params
    console.log(code);

    if (!code) {
        return res.status(400).json({ message: 'Voucher code is required' }); // Nếu không có mã
    }

    try {
        await client.connect(); 
        const db = client.db("PBL6"); // Kết nối tới MongoDB
        const voucherCollection = db.collection('vouchers'); // Truy cập collection 'vouchers'

        // Tìm voucher theo code và status
        const voucher = await voucherCollection.findOne({ code: code, status: 1 });

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher không hợp lệ hoặc hết hạn' }); // Nếu không tìm thấy hoặc hết hạn
        }

        // Nếu voucher hợp lệ, trả về thông tin voucher
        return res.status(200).json({
            _id: voucher._id.toString(), // Chuyển ObjectId thành string
            code: voucher.code,
            percent: voucher.percent,
            date_created: voucher.date_created,
        });
    } catch (error) {
        console.error('Lỗi khi áp mã voucher:', error);
        return res.status(500).json({ message: 'Lỗi server', error });
    }
});

module.exports = router;
