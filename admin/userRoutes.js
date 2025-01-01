const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const router = express.Router();
const { authenticateToken } = require("../middleware/authenticateToken");
const { getClient } = require("../db");
const { v4: uuidv4 } = require('uuid');
const bcrypt = require("bcrypt");

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

const {
    updateAvatarUser
} = require("../image/image");

// Cấu hình multer để lưu trữ ảnh
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Thư mục lưu ảnh
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // Tạo tên file duy nhất
    }
});
const upload = multer({ storage: storage });
const default_avatar_image = './defaultImage/default_user.jpg'


router.post('/admin/users/create', authenticateToken, upload.single('image'), async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền truy cập
    if (id_role !== 2) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    console.log("File:", req.file);
    console.log("Body:", req.body);

    const {
        email,
        password,
        id_role: id_roleNewUser,
        name,
        nationality,
        gender,
        telephone_number,
        province,
        district,
        ward,
        street,
    } = req.body;

    // Kiểm tra thông tin cơ bản
    if (!email || !password || !id_roleNewUser) {
        console.log("Thiếu thông tin bắt buộc.");
        return res.status(400).json();
    }

    try {
        const client = getClient();
        const db = client.db("PBL6");
        const usersCollection = db.collection("users");

        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
            console.log("Email đã tồn tại.");
            return res.status(400).json();
        }

        let imageUrl = null;

        // Chỉ xử lý ảnh nếu có file được upload
        if (req.file) {
            const imagePath = req.file.path;
            const uploadResult = await cloudinary.uploader.upload(imagePath, {
                folder: "avatars"
            });
            imageUrl = uploadResult.secure_url;
        }else{
            const imagePath = default_avatar_image;
            const uploadResult = await cloudinary.uploader.upload(imagePath, {
                folder: "avatars"
            });
            imageUrl = uploadResult.secure_url;
        }

        // Mã hóa mật khẩu
        const saltRounds = 10;
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            _id: uuidv4(),
            email: email,
            password: hashedPassword,
            id_role: parseInt(id_roleNewUser, 10),
            name,
            gender: gender === 'true', // Chuyển đổi string thành boolean
            telephone_number,
            province,
            district,
            ward,
            street,
            image: imageUrl,
            nationality,
            status: 1,
            is_verified: true,
        };

        const result = await usersCollection.insertOne(newUser);
        console.log("Tạo tài khoản thành công." + result.insertedId);
        res.status(201).json();
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ message: "Đã xảy ra lỗi khi tạo tài khoản." });
    } finally {
    }
});

router.put('/admin/users/update', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;
    const currentUserId = req.user.userId;

    if (id_role !== 2) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }
    console.log("Body:", req.body);

    const {
        id,
        email,
        password,
        id_role: id_roleToChange,
        name,
        telephone_number,
        province,
        district,
        ward,
        street,
        nationality,
    } = req.body;


    try {
        // Kết nối đến MongoDB
        const client = getClient();
        const db = client.db("PBL6");
        const usersCollection = db.collection("users");

        const userToUpdate = await usersCollection.findOne({ _id: id });
        
        if (!userToUpdate) {
            return res.status(404).json({ message: "Người dùng không tồn tại" });
        }

        // Kiểm tra nếu người dùng hiện tại là admin và đang cố gắng cập nhật thông tin của admin khác
        if (id_role === 2 && userToUpdate.id_role === 2 && currentUserId !== id) {
            return res.status(403).json({ message: "Bạn không có quyền cập nhật thông tin của admin khác" });
        }
        
        // Tìm và cập nhật người dùng
        const updateData = {
            email,
            id_role: parseInt(id_roleToChange, 10),
            name,
            telephone_number,
            province,
            district,
            ward,
            street,
            nationality,
        };

        // Nếu có mật khẩu mới, mã hóa và cập nhật
        if (password) {
            const saltRounds = 10;
            const salt = await bcrypt.genSalt(saltRounds);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const result = await usersCollection.findOneAndUpdate(
            { _id: id },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        if (!result) {
            return res.status(400).json();
        }

        console.log(`User with id ${id} updated successfully.`);
        res.status(200).json();
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {

    }
});

router.put('/admin/users/avatar', authenticateToken, upload.single('image'), async (req, res) => {
    const id_role = req.user.id_role;

    if (!req.file) {
        return res.status(400).json(); // Nếu không có file ảnh
    }
    // Kiểm tra quyền truy cập
    if (id_role !== 2) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }
    console.log("File:", req.file);
    console.log("Body:", req.body);

    const {
        id_user: id_userToChange
    } = req.body;

    try {
        // Lấy đường dẫn của ảnh đã upload
        const imagePath = req.file.path;

        // Cập nhật avatar người dùng
        const updateResult = await updateAvatarUser(id_userToChange, imagePath);

        if (updateResult.success) {
            // Trả về kết quả thành công
            return res.status(200).json({imageUrl: updateResult.imageUrl});
        } else {
            return res.status(500).json({ message: updateResult.message });
        }
    } catch (error) {
        console.error('Error updating avatar:', error);
        return res.status(500).json({ message: "Lỗi máy chủ", error });
    }
});

router.get('/admin/users/get', authenticateToken, async (req, res) => {
    const id_role1 = req.user.id_role;

    // Kiểm tra quyền truy cập
    if (id_role1 !== 2 && id_role1 !== 3) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    console.log("Query Parameters:", req.query);

    try {
        // Kết nối tới MongoDB
        const client = getClient();
        const db = client.db("PBL6");
        const usersCollection = db.collection("users");
        // Lấy query parameters để lọc dữ liệu
        const { search, id_role: roleFilter, page = 1, limit = 10, status } = req.query;

        const query = {};

        // Lọc theo tên hoặc email
        if (search) {
            // const normalizeText = (text) =>
            //     text
            //         .normalize('NFD') // Phân tách Unicode
            //         .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu
            //         .replace(/[^a-zA-Z0-9 ]/g, '') // Loại bỏ ký tự đặc biệt
            //         .toLowerCase();

            // const normalizedSearch = normalizeText(search);

            query.$or = [
                { name: { $regex: new RegExp(search, 'i') } },
                { email: { $regex: new RegExp(search, 'i') } },
            ];
        }

        // Lọc theo vai trò
        if (roleFilter) {
            query.id_role = parseInt(roleFilter, 10);
        }

        // Lọc theo trạng thái
        if (status) {
            query.status = parseInt(status, 10);
        }

        // Tính toán phân trang
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const total = await usersCollection.countDocuments(query);

        // Lấy danh sách người dùng
        const users = await usersCollection
            .find(query)
            .skip(skip)
            .limit(parseInt(limit, 10))
            .toArray();

        // Tính tổng số trang
        const totalPages = Math.ceil(total / parseInt(limit, 10));
        const totalRecords = users.length;
        res.status(200).json({
            users,
            currentPage: parseInt(page, 10),
            limit: parseInt(limit, 10),
            totalRecords: total,
            totalPages,
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Error fetching users" });
    } finally {

    }
});

router.put('/admin/users/delete', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Chỉ admin được phép thực hiện
    if (id_role !== 2) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    const { id_user } = req.body; // Lấy id_user từ body request

    // Kiểm tra đầu vào
    if (!id_user) {
        return res.status(400).json();
    }

    try {
        // Kết nối tới MongoDB
        const client = getClient();
        const db = client.db("PBL6");
        const usersCollection = db.collection("users");
        // Tìm và cập nhật trạng thái `status` về 0 (xóa mềm)
        const result = await usersCollection.updateOne(
            { _id: id_user }, // Điều kiện tìm người dùng theo id
            { $set: { status: 0 } } // Cập nhật status về 0
        );

        if (result.matchedCount === 0) {
            return res.status(400).json();
        }

        console.log(`User with id ${id_user} status updated to 0.`);
        res.status(200).json();
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ message: 'An error occurred while deleting user' });
    } finally {

    }
});

router.put('/admin/users/ban', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;
    if (id_role !== 2 && id_role !== 3) {
        return res.status(400).json({ message: 'Unauthorized access' });
    }
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json();
    }
    try{
        const client = getClient();
        const db = client.db("PBL6");
        const usersCollection = db.collection("users");
        const result = await usersCollection.updateOne(
            { _id: userId },
            { $set: { status: 2 } }
        );
        if (result.matchedCount === 0) {
            return res.status(400).json();
        }
        console.log(`User with id ${userId} status updated to 2.`);
        res.status(200).json();
    }catch(error){
        console.error('Error updating user status:', error);
        res.status(500).json({ message: 'An error occurred while banning user' });
    }
});

router.put('/admin/users/unban', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;
    if (id_role !== 2 && id_role !== 3) {
        return res.status(400).json({ message: 'Unauthorized access' });
    }
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json();
    }
    try{
        const client = getClient();
        const db = client.db("PBL6");
        const usersCollection = db.collection("users");
        const result = await usersCollection.updateOne(
            { _id: userId },
            { $set: { status: 1 } }
        );
        if (result.matchedCount === 0) {
            return res.status(400).json();
        }
        console.log(`User with id ${userId} status updated to 1.`);
        res.status(200).json();
    }catch(error){
        console.error('Error updating user status:', error);
        res.status(500).json({ message: 'An error occurred while banning user' });
    }
});
module.exports = router;
