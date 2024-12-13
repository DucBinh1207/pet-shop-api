// routes/authRoutes.js
const express = require("express");
require("dotenv").config();

const router = express.Router();

const { authenticateToken } = require("../middleware/authenticateToken");
const { login, register, logout, verifyToken, forgotPassword, changePassword } = require("../controllers/authController");

//Đăng nhập
router.post("/login", login);

//Đăng ký
router.post("/register", register);

//Đăng xuất
router.post("/logout", authenticateToken, logout);

//Xác thực token từ web
router.post("/verify-token", verifyToken);

//Quên mật khẩu
router.post("/forgot-password", forgotPassword);

//Đặt mật khẩu khi vừa mới đăng ký
router.put("/change-password", changePassword);

module.exports = router;
