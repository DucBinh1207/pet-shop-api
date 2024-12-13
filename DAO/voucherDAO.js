const express = require('express');
const router = express.Router();

const { getClient } = require("../db");
// Middleware để parse JSON body
router.use(express.json());


exports.applyVoucher = async (code) => {
    try {
        const client = getClient();
        const db = client.db("PBL6");
        const voucherCollection = db.collection('vouchers'); // Truy cập collection 'vouchers'

        // Tìm voucher theo code, status và quantity > 0
        const voucher = await voucherCollection.findOne({ code: code, status: 1, quantity: { $gt: 0 } });

        if (!voucher) {
            return {
                status: 400,
            };
        }
        // const a = voucher._id.toString();
        // // Nếu voucher hợp lệ, trả về thông tin voucher
        // console.log({a});
        return {
            status: 200,
            id: voucher._id.toString(), // Chuyển ObjectId thành string
            code: voucher.code,
            percent: voucher.percent,
            date_created: voucher.date_created,
        };
    } catch (error) {
        console.error('Lỗi khi áp mã voucher:', error);
        return {
            status: 500,
            message: 'Lỗi server', 
            error
        };
    }
}