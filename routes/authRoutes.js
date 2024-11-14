// routes/authRoutes.js

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const redisClient = require("../middleware/redisClient");
require("dotenv").config();

const redis = redisClient.init();

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
const { authenticateToken } = require("../middleware/authenticateToken");

const SECRET_KEY = process.env.SECRET_KEY;

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
      console.log(result.status);
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
    res.status(500).json({ message: "Internal server error" });
  }
});

//Đăng xuất
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const token = req.token;
    if (token) {
      const decoded = jwt.verify(token, SECRET_KEY);
      const expirationTime = decoded.exp;
      const currentTime = Math.floor(Date.now() / 1000);
      const remainingTime = expirationTime - currentTime;

      const userToken = process.env.PREFIX_AUTH_TOKEN + "_" + token;

      await redis.set(userToken, token, {
        EX: remainingTime,
      });
      res.status(200).json();
    }
  } catch (err) {
    res.status(500).json();
  }
});

//Xác thực token từ web
router.post("/verify-token", async (req, res) => {
  const { token } = req.body; // Use query parameter or request body for token

  try {
    // Verify the token using JWT
    const decoded = jwt.verify(token, SECRET_KEY);

    const userToken = process.env.PREFIX_VERIFY_TOKEN + decoded.userId;
    console.log(userToken);

    if (token === (await redis.get(userToken))) {
      res.status(200).json();
    } else {
      return res.status(401).json({
        message: "Token has expired. Please request a new token.",
      });
    }
  } catch (err) {
    // Handle different types of JWT errors
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token has expired. Please request a new token.",
      });
    } else if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid token.",
      });
    } else {
      console.error(err);
      return res.status(500).json({
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
    const token = jwt.sign({ userId: user._id }, SECRET_KEY, {
      expiresIn: "1h",
    });

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

    const resetLink = `${process.env.END_USER_URL}/reset-password?token=${token}`;

    const mailOptions = {
      from: "khongquen012@gmail.com",
      to: email,
      subject: "Xác nhận đổi mật khẩu tài khoản Whiskers",
      html: `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #333;
              background-color: #f8f9fa;
              margin: 0;
              padding: 0;
            }
            .container {
              width: 100%;
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            h1 {
              font-size: 24px;
              color: #531492;
              text-align: center;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              margin-bottom: 30px; /* Thêm margin dưới */
            }
            h1 img {
              width: 40px;
              height: 40px;
            }
            h1 span {
              font-size: 40px;
              line-height: 40px;
              font-weight: bold;
              color: #531492;
            }
            p {
              font-size: 16px;
              line-height: 1.5;
              text-align: left;
              margin-bottom: 20px; /* Thêm margin dưới */
            }
            .btn {
              display: inline-block;
              padding: 12px 40px;
              background-color: #531492;
              color: #ffffff;
              text-align: center;
              text-decoration: none;
              border-radius: 10px;
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
              margin: 20px 0px 20px 0px;
            }
            .footer {
              text-align: left;
              font-size: 14px;
              color: #777;
              margin-top: 20px;
            }
            .footer a {
              color: #007bff;
              text-decoration: none;
            }
            .btn-container {
              text-align: center;
              margin-top: 20px; /* Thêm margin trên cho container nút */
            }
          </style>
        </head>
        <body>

           <div class="container">
            <h1>
              <a href="${process.env.END_USER_URL}" target="_blank" style="text-decoration: none; color: inherit; display: flex; align-items: center; justify-content: center; gap: 10px;">
                <img src="https://i.imgur.com/riVShrz.png" alt="Whiskers Logo" style="width: 40px; height: 40px;">
                <span>Whiskers</span>
              </a>
            </h1>

            <p>Chào mừng bạn đến với Whiskers! Để hoàn tất quá trình đổi mật khẩu, vui lòng nhấn vào nút dưới đây.</p>

            <!-- Căn giữa nút -->
            <div class="btn-container">
              <a href="${resetLink}" target="_blank" class="btn">Đổi mật khẩu</a>
            </div>

            <p class="footer">
              Nếu bạn gặp vấn đề với nút trên, bạn cũng có thể sao chép và dán liên kết dưới đây:
            </p>
            <p class="footer">
              <a href="${resetLink}" target="_blank">${resetLink}</a>
            </p>
          </div>

        </body>
      </html>`,
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
router.put("/change-password", async (req, res) => {
  const { token, password } = req.body; // Lấy token và password từ body

  if (!token) {
    return res
      .status(401)
      .json({ message: "Token không hợp lệ hoặc không có." });
  }
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.userId;

    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    await client.connect();
    const db = client.db("PBL6"); // Kết nối tới database "PBL6"
    const usersCollection = db.collection("users"); // Truy cập vào collection 'users'

    // Tìm người dùng theo _id từ MongoDB
    console.log("userId (from token):", userId); // Log ra giá trị userId
    const user = await usersCollection.findOne({ _id: userId });

    if (!user) {
      return res.status(404).jsonp({ message: "Người dùng không tồn tại" });
    }

    // Kiểm tra mật khẩu cũ

    if (await bcrypt.compare(password, user.password)) {
      return res.status(400).jsonp({
        message: "Mật khẩu mới không được trùng với mật khẩu hiện tại",
      });
    }
    // Cập nhật mật khẩu mới
    const updateResult = await usersCollection.updateOne(
      { _id: userId }, // Tìm người dùng theo _id
      { $set: { password: hashedPassword, status: 1, is_verified: true } } // Cập nhật mật khẩu
    );

    if (updateResult.modifiedCount > 0) {
      const userToken = process.env.PREFIX_VERIFY_TOKEN + decoded.userId;
      await redis.del(userToken);
      res.status(200).jsonp({ message: "Cập nhật mật khẩu thành công" });
    } else {
      res.status(500).jsonp({
        message: "Đã có lỗi xảy ra trong quá trình thay đổi mật khẩu",
      });
    }
  } catch (error) {
    console.error("Error changing password:", error); // In ra lỗi nếu có
    res.status(500).jsonp({ message: "Lỗi máy chủ", error });
  }
});

module.exports = router;
