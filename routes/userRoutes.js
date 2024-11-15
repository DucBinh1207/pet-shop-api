const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");

router.use(express.json());
const { authenticateToken } = require("../middleware/authenticateToken");
const { client } = require("../db");

router.get('/user/info', authenticateToken, async (req, res) => {
    const userId = req.user.userId; // Lấy id từ token

    try {
        await client.connect(); 
        const db = client.db("PBL6"); // Kết nối tới database "PBL6"
        const usersCollection = db.collection('users'); // Truy cập vào collection 'users'

        // Tìm người dùng theo _id từ MongoDB
        console.log("userId (from token):", userId); // Log ra giá trị userId
        const user = await usersCollection.findOne({ _id: userId, status: 1 });

        if (user) {
            res.jsonp({
                name: user.name,
                email: user.email,
                telephone_number: user.telephone_number,
                nationality: user.nationality,
                province: user.province,
                district: user.district,
                ward: user.ward,
                street: user.street,
                image: user.image
            });
        } else {
            res.status(404).jsonp({ message: "Người dùng không tồn tại" });
        }
    } catch (error) {
        console.error('Error fetching user info:', error); // In ra lỗi nếu có
        res.status(500).jsonp({ message: "Lỗi máy chủ", error });
    }
});
// API để thay đổi mật khẩu người dùng trong trang user
router.put('/user/change-password', authenticateToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.userId; // Lấy id người dùng từ token

    try {
        await client.connect(); 
        const db = client.db("PBL6"); // Kết nối tới database "PBL6"
        const usersCollection = db.collection('users'); // Truy cập vào collection 'users'

        // Tìm người dùng theo _id từ MongoDB
        console.log("userId (from token):", userId); // Log ra giá trị userId
        const user = await usersCollection.findOne({ _id: userId, status: 1 });

        if (!user) {
            return res.status(404).jsonp({ message: "Người dùng không tồn tại" });
        }

        if (!await bcrypt.compare(oldPassword, user.password)) {
            return res.status(400).jsonp({ message: "Mật khẩu cũ không chính xác" });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        // Cập nhật mật khẩu mới
        const updateResult = await usersCollection.updateOne(
            { _id: userId },  // Tìm người dùng theo _id
            { $set: { password: hashedPassword } } // Cập nhật mật khẩu
        );

        if (updateResult.modifiedCount > 0) {
            res.jsonp({ message: "Thay đổi mật khẩu thành công" });
        } else {
            res.status(500).jsonp({ message: "Đã có lỗi xảy ra trong quá trình thay đổi mật khẩu" });
        }
    } catch (error) {
        console.error('Error changing password:', error); // In ra lỗi nếu có
        res.status(500).jsonp({ message: "Lỗi máy chủ", error });
    }
});
// API để cập nhật thông tin người dùng
router.put('/user/updateAddress', authenticateToken, async (req, res) => {
    const { province, district, ward, street } = req.body;
    const userId = req.user.userId; // Lấy id người dùng từ token

    try {
        await client.connect(); 
        const db = client.db("PBL6"); // Kết nối tới database "PBL6"
        const usersCollection = db.collection('users'); // Truy cập vào collection 'users'

        // Tìm người dùng theo userId trước khi cập nhật
        const existingUser = await usersCollection.findOne({ _id: userId, status: 1 });

        if (!existingUser) {
            // Nếu không tìm thấy người dùng, trả về 404
            return res.status(404).jsonp({ message: "Người dùng không tồn tại" });
        }

        // Cập nhật thông tin người dùng
        const updateResult = await usersCollection.updateOne(
            { _id: userId }, // Tìm người dùng theo _id
            {
                $set: {
                    province,
                    district,
                    ward,
                    street,
                }
            }
        );

        // Nếu không có bản ghi nào được cập nhật, trả về trạng thái 200 kèm thông báo
        if (updateResult.modifiedCount === 0) {
            return res.status(200).jsonp({ message: "Không có thông tin nào thay đổi" });
        }
        res.jsonp({ message: "Cập nhật thông tin thành công", });

    } catch (error) {
        console.error('Error updating user info:', error); // In ra lỗi nếu có
        res.status(500).jsonp({ message: "Lỗi máy chủ", error });
    }
});

router.put('/user/update', authenticateToken, async (req, res) => {
    const { name, telephone_number, nationality, image } = req.body;
    const userId = req.user.userId; // Lấy id người dùng từ token
    console.log(userId);
    try {
        await client.connect(); 
        const db = client.db("PBL6"); // Kết nối tới database "PBL6"
        const usersCollection = db.collection('users'); // Truy cập vào collection 'users'

        // Tìm người dùng theo userId trước khi cập nhật
        const existingUser = await usersCollection.findOne({ _id: userId, status: 1 });

        if (!existingUser) {
            // Nếu không tìm thấy người dùng, trả về 404
            return res.status(404).jsonp({ message: "Người dùng không tồn tại" });
        }

        // Cập nhật thông tin người dùng
        const updateResult = await usersCollection.updateOne(
            { _id: userId }, // Tìm người dùng theo _id
            {
                $set: {
                    name,
                    telephone_number,
                    nationality,
                    image
                }
            }
        );

        // Nếu không có bản ghi nào được cập nhật, trả về trạng thái 200 kèm thông báo
        if (updateResult.modifiedCount === 0) {
            return res.status(200).jsonp({ message: "Không có thông tin nào thay đổi" });
        }


        res.jsonp({ message: "Cập nhật thông tin thành công", });

    } catch (error) {
        console.error('Error updating user info:', error); // In ra lỗi nếu có
        res.status(500).jsonp({ message: "Lỗi máy chủ", error });
    }
});


module.exports = router;
