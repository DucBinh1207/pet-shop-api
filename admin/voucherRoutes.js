const express = require('express');
const router = express.Router();
// Middleware để parse JSON body
router.use(express.json());
const { authenticateToken } = require("../middleware/authenticateToken");
const { client } = require("../db");
const { v4: uuidv4 } = require('uuid');

router.get("/admin/vouchers", authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền admin
    if (id_role !== 2) {
        return res.status(400).json({ message: "Bạn không có quyền truy cập" });
    }

    // Nhận các query từ client
    const searchCode = req.query.code || ""; // Tìm kiếm theo code
    const filterAvailable = parseInt(req.query.available, 10); // 1: quantity > 0, 0: quantity = 0
    const filterStatus = parseInt(req.query.status, 10); // 1: status = 1, 0: status = 0
    const sortBy = req.query.sortBy || "latest"; // Sắp xếp, mặc định là mới nhất

    try {
        await client.connect();
        const db = client.db("PBL6");
        const vouchersCollection = db.collection("vouchers");

        // Lấy danh sách orders
        let vouchers = await vouchersCollection.find({}).toArray();

        // Nếu có lọc theo `code`
        if (searchCode) {
            vouchers = vouchers.filter((vouhcher) =>
                vouhcher.code.toLowerCase().includes(searchCode.toLowerCase())
            );
        }

        if (!isNaN(filterAvailable)) {
            vouchers = vouchers.filter((vouhcher) =>
                filterAvailable === 1
                    ? parseInt(vouhcher.quantity, 10) > 0
                    : parseInt(vouhcher.quantity, 10) === 0
            );
        }

        // Nếu có lọc theo `status`
        if (!isNaN(filterStatus)) {
            vouchers = vouchers.filter((vouhcher) => vouhcher.status === filterStatus);
        }

        // Sắp xếp theo thời gian
        if (sortBy === "latest") {
            vouchers.sort((a, b) => new Date(b.date_created) - new Date(a.date_created));
        }

        const completeVouhchers = vouchers.map(voucher => ({
            id: voucher._id.toString(),
            code: voucher.code,
            name: voucher.name,
            percent: voucher.percent,
            date_created: voucher.date_created,
            status: voucher.status,
            quantity: voucher.quantity
        }));

        res.status(200).json({
            vouchers: completeVouhchers,
        });
    } catch (error) {
        console.error("Error filtering orders:", error);
        res.status(500).json({ message: "Lỗi máy chủ", error });
    } finally {
        await client.close(); // Đảm bảo đóng kết nối sau khi xử lý
    }
});


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
        await client.connect();
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
        await client.close();
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
        await client.connect();
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
        await client.close();
    }
});
// Delete voucher
router.put('/admin/vouchers/delete', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Chỉ admin được phép thực hiện
    if (id_role !== 2) {
        return res.status(400).json();
    }

    const { id } = req.body; // Lấy id_user từ body request

    // Kiểm tra đầu vào
    if (!id) {
        return res.status(400).json();
    }

    try {
        // Kết nối tới MongoDB
        await client.connect();
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
        await client.close();
    }
});

module.exports = router;