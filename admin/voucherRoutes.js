const express = require('express');
const router = express.Router();
// Middleware để parse JSON body
router.use(express.json());
const { authenticateToken } = require("../middleware/authenticateToken");
const { getClient } = require("../db");
const { v4: uuidv4 } = require('uuid');

router.get("/admin/vouchers", authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền admin
    if (id_role !== 2 && id_role !== 3) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    // Nhận các query từ client
    const searchCode = req.query.search || ""; // Tìm kiếm theo code
    const filterStatus = parseInt(req.query.status, 10); // Các trạng thái: 1: tất cả, 2: còn hàng, 3: hết hàng, 0: đã xóa
    const sortBy = req.query.sortBy || "latest"; // Sắp xếp, mặc định là mới nhất
    const limit = parseInt(req.query.limit, 10) || 10; // Mặc định lấy 10 đơn hàng mỗi trang
    const page = parseInt(req.query.page, 10) || 1; // Mặc định là trang 1

    try {
        const client = getClient();
        const db = client.db("PBL6");
        const vouchersCollection = db.collection("vouchers");

        // Lấy danh sách vouchers
        let vouchers = await vouchersCollection.find({}).toArray();

        // Nếu có lọc theo `code`
        if (searchCode) {
            vouchers = vouchers.filter((voucher) =>
                voucher.code.toLowerCase().includes(searchCode.toLowerCase())
            );
        }

        // Nếu có lọc theo `status`
        if (!isNaN(filterStatus)) {
            switch (filterStatus) {
                case 1: // Tất cả
                    break;
                case 2: // Còn hàng (quantity > 0) và chưa xóa
                    vouchers = vouchers.filter((voucher) =>
                        parseInt(voucher.quantity, 10) > 0 && voucher.status !== 0
                    );
                    break;
                case 3: // Hết hàng (quantity = 0) và chưa xóa
                    vouchers = vouchers.filter((voucher) =>
                        parseInt(voucher.quantity, 10) === 0 && voucher.status !== 0
                    );
                    break;
                case 0: // Đã xóa (status = 0)
                    vouchers = vouchers.filter((voucher) => voucher.status === 0);
                    break;
                default:
                    break;
            }
        }

        // Sắp xếp theo thời gian
        if (sortBy === "latest") {
            vouchers.sort((a, b) => new Date(b.date_created) - new Date(a.date_created));
        } else if (sortBy === "furthest") {
            vouchers.sort((a, b) => new Date(a.date_created) - new Date(b.date_created));
        }

        // Tính toán phân trang
        const totalVouchers = vouchers.length;
        const totalPages = Math.ceil(totalVouchers / limit);
        const skip = (page - 1) * limit;

        // Lấy dữ liệu theo trang
        const paginatedVouchers = vouchers.slice(skip, skip + limit);

        const completeVouchers = paginatedVouchers.map(voucher => ({
            id: voucher._id.toString(),
            code: voucher.code,
            name: voucher.name,
            percent: voucher.percent,
            date_created: voucher.date_created,
            status: voucher.status,
            quantity: parseInt(voucher.quantity, 10),
        }));
        const totalRecords = completeVouchers.length;
        res.status(200).json({
            vouchers: completeVouchers,
            totalVouchers,
            totalPages,
            currentPage: page,
            totalRecords
        });
    } catch (error) {
        console.error("Error filtering vouchers:", error);
        res.status(500).json({ message: "Lỗi máy chủ", error });
    }
});
// Create voucher
router.post('/admin/vouchers/create', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền admin
    if (id_role !== 2) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    const { code, percent, quantity } = req.body;

    // Kiểm tra thông tin cơ bản
    if (!code || !percent || !quantity) {
        return res.status(400).json({ message: "Thiếu thông tin bắt buộc. Vui lòng cung cấp code, percent và quantity." });
    }

    try {
        const client = getClient();
        const db = client.db("PBL6");
        const vouchersCollection = db.collection("vouchers");

        // Kiểm tra mã voucher đã tồn tại hay chưa
        const existingVoucher = await vouchersCollection.findOne({ code: code, status: 1 });
        if (existingVoucher) {
            return res.status(400).json({ message: "Mã voucher đã tồn tại." });
        }

        // Thêm voucher mới
        const newVoucher = {
            _id: uuidv4(),
            code: code,
            percent: percent,
            quantity: quantity,
            status: 1, // Đặt trạng thái active (giả sử status = 1 là active)
            date_created: new Date(),
        };
        await vouchersCollection.insertOne(newVoucher);

        return res.status(201).json();
    } catch (err) {
        console.error("Error creating voucher:", err);
        return res.status(500).json({ message: "Lỗi tạo voucher." });
    } finally {
        // Đảm bảo đóng kết nối

    }
});
// Update voucher
router.put('/admin/vouchers/update', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền admin
    if (id_role !== 2) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    const {
        id,
        code,
        percent,
        quantity,
    } = req.body;

    try {
        // Kết nối đến MongoDB
        const client = getClient();
        const db = client.db("PBL6");
        const vouchersCollection = db.collection("vouchers");

        // Tìm và cập nhật người dùng
        const updateData = {
            code,
            percent,
            quantity,
        };

        const result = await vouchersCollection.findOneAndUpdate(
            { _id: id },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        if (!result) {
            return res.status(400).json();
        }

        res.status(200).json();
    } catch (error) {
        console.error('Error updating voucher:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {

    }
});
// Delete voucher
router.put('/admin/vouchers/delete', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Chỉ admin được phép thực hiện
    if (id_role !== 2) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    const { id } = req.body; // Lấy id_user từ body request

    // Kiểm tra đầu vào
    if (!id) {
        return res.status(400).json();
    }

    try {
        // Kết nối tới MongoDB
        const client = getClient();
        const db = client.db("PBL6");
        const vouchersCollection = db.collection("vouchers");
        // Tìm và cập nhật trạng thái `status` về 0 (xóa mềm)
        const result = await vouchersCollection.updateOne(
            { _id: id }, // Điều kiện tìm người dùng theo id
            { $set: { status: 0 } } // Cập nhật status về 0
        );

        if (result.matchedCount === 0) {
            return res.status(400).json();
        }

        res.status(200).json();
    } catch (error) {
        console.error('Error updating voucher status:', error);
        res.status(500).json({ message: 'An error occurred while deleting voucher' });
    } finally {

    }
});
//Undelete voucher
router.put('/admin/vouchers/unDelete', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Chỉ admin được phép thực hiện
    if (id_role !== 2) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    const { id } = req.body; // Lấy id_user từ body request

    // Kiểm tra đầu vào
    if (!id) {
        return res.status(400).json();
    }

    try {
        // Kết nối tới MongoDB
        const client = getClient();
        const db = client.db("PBL6");
        const vouchersCollection = db.collection("vouchers");
        // Tìm và cập nhật trạng thái `status` về 1 
        const result = await vouchersCollection.updateOne(
            { _id: id }, // Điều kiện tìm người dùng theo id
            { $set: { status: 1 } } // Cập nhật status về 1
        );

        if (result.matchedCount === 0) {
            return res.status(400).json();
        }

        res.status(200).json();
    } catch (error) {
        console.error('Error updating voucher status:', error);
        res.status(500).json({ message: 'An error occurred while deleting voucher' });
    } finally {

    }
});

module.exports = router;