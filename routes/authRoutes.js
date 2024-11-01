// routes/authRoutes.js

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const {
  loginUser,
  registerUser,
  verifyEmail,
  generateToken,
} = require("../auth/auth");
// const { sql, poolPromise } = require("../db");
const router = express.Router();
const {
  USER_STATUS,
  USER_VERIFICATION,
} = require("../status_constant/users_status");
const { client } = require("../db");
const nodemailer = require("nodemailer");

const SECRET_KEY =
  "0f5f43b5b226531628722a0f20b4c276de87615dfc8516ea4240c93f4135d4b1";
//Đăng nhập
router.post("/login", async (req, res) => {
  const { email, password, isRememberMe } = req.body; // Add isRememberMe to the request body

  try {
    const result = await loginUser(email, password);

    // Handle various success and failure cases
    if (result.success) {
      const user = result.user;

      // Generate access and refresh tokens
      const accessToken = generateToken(user._id, isRememberMe);

      // Trả về phản hồi với access token và thông tin người dùng
      res.status(200).json({
        token: accessToken,
        email: user.email,
        id_role: user.id_role,
      });
    } else {
      // Status 401 for authentication errors
      // res.status(401).json({ message: result.message });
      res.status(result.status).json({ message: result.message });
    }
  } catch (err) {
    console.error(err);
    // Status 500 for internal server errors
    res.status(500).json({ message: "Internal server error" });
  }
});
//Đăng ký
router.post("/register", async (req, res) => {
  const { email, id_role } = req.body;

  try {
    const result = await registerUser(email, id_role);

    if (result.success) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(401).json({ message: result.message });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});
//Xác thực token từ web
router.post("/verify-token", async (req, res) => {
  const { token } = req.body; // Use query parameter or request body for token

  try {
    // Verify the token using JWT
    const decoded = jwt.verify(token, SECRET_KEY);

    // If the token is valid, return success along with decoded data (like user ID or email)
    res.status(200).json({
      success: true,
      message: "Token is valid.",
      userId: decoded.userId, // Assuming the token contains userId
      email: decoded.email, // Assuming the token contains email
    });
  } catch (err) {
    // Handle different types of JWT errors
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please request a new token.",
      });
    } else if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    } else {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }
});
//Quên mật khẩu
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    await client.connect();
    const database = client.db("PBL6");
    const usersCollection = database.collection("users");

    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate reset token
    const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: "1h" });

    // Store the token in MongoDB with the user
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { resetToken: token } }
    );

    // Send reset password email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "khongquen012@gmail.com",
        pass: "zoijiuykwjnueeju",
      },
    });

    const resetLink = `http://localhost:8000/api/auth/reset-password?token=${token}`;

    const mailOptions = {
      from: "khongquen012@gmail.com",
      to: email,
      subject: "Password Reset Request",
      text: `Click the link to reset your password: ${resetLink}`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Reset password link sent to your email" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  } finally {
    await client.close();
  }
});
//Đặt mật khẩu khi vừa mới đăng ký
router.put('/change-password', async (req, res) => {
  const { token, password } = req.body; // Lấy token và password từ body

  if (!token) {
    return res.status(401).json({ message: "Token không hợp lệ hoặc không có." });
  }
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.userId;

    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    await client.connect();
    const db = client.db("PBL6"); // Kết nối tới database "PBL6"
    const usersCollection = db.collection('users'); // Truy cập vào collection 'users'

    // Tìm người dùng theo _id từ MongoDB
    console.log("userId (from token):", userId); // Log ra giá trị userId
    const user = await usersCollection.findOne({ _id: userId });

    if (!user) {
      return res.status(404).jsonp({ message: "Người dùng không tồn tại" });
    }

    // Kiểm tra mật khẩu cũ

    if (await bcrypt.compare(password, user.password)) {
      return res.status(400).jsonp({ message: "Mật khẩu mới không được trùng với mật khẩu hiện tại" });
    }
    // Cập nhật mật khẩu mới
    const updateResult = await usersCollection.updateOne(
      { _id: userId },  // Tìm người dùng theo _id
      { $set: { password: hashedPassword, status: 1, is_verified: true  } }, // Cập nhật mật khẩu
    );

    if (updateResult.modifiedCount > 0) {
      res.status(200).jsonp({ message: "Cập nhật mật khẩu thành công" });
    } else {
      res.status(500).jsonp({ message: "Đã có lỗi xảy ra trong quá trình thay đổi mật khẩu" });
    }
  } catch (error) {
    console.error('Error changing password:', error); // In ra lỗi nếu có
    res.status(500).jsonp({ message: "Lỗi máy chủ", error });
  }
});
// Route Hello World
router.get("/test", (req, res) => {
  res.json({ message: "Hello, World!" });
});

module.exports = router;
