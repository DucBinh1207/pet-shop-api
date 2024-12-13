const {
  USER_STATUS,
  USER_VERIFICATION,
} = require("../status_constant/users_status");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const SECRET_KEY =
  "0f5f43b5b226531628722a0f20b4c276de87615dfc8516ea4240c93f4135d4b1";
const { client } = require("../db");
require("dotenv").config();
const redisClient = require("../middleware/redisClient");
const redis = redisClient.init();
// Hash the password for registration
async function registerUser(email, id_role) {
  try {
    await client.connect();
    const database = client.db("PBL6");
    const usersCollection = database.collection("users");

    // Check if the email is already registered
    const user = await usersCollection.findOne({ email: email });

    if (user) {
      if (user.is_verified) {
        return {
          success: false,
          message: "User already registered and verified.",
        };
      } else {
        const resend_result = await resendVerificationEmail(
          user._id,
          user.email
        );
        return {
          success: resend_result.success,
          message: resend_result.message,
        };
      }
    }

    const userId = uuidv4();
    // const saltRounds = 10;
    // const password = "";
    // const hashedPassword = await bcrypt.hash(password, saltRounds);
    const tokenCreatedAt = new Date();

    // Insert new user
    const newUser = {
      _id: userId,
      email: email,
      password: "",
      id_role: 1,
      token_created_at: tokenCreatedAt,
      status: USER_STATUS.NULL_PASS,
      is_verified: false,
    };

    await usersCollection.insertOne(newUser);

    const token = jwt.sign({ userId, email }, SECRET_KEY, { expiresIn: "1h" });
    const userToken = process.env.PREFIX_VERIFY_TOKEN + userId;
    await redis.set(userToken, token, {
      EX: 60 * 60,
    });

    const verificationLink = `${process.env.END_USER_URL}/email-confirm?token=${token}`;
    await sendVerificationEmail(email, verificationLink);

    return {
      success: true,
      message: "User registered successfully! Please verify your email.",
    };
  } catch (err) {
    console.error(err);
    return { success: false, message: "Error registering user." };
  } finally {
    await client.close();
  }
}

// Compare the password for login
async function loginUser(email, password) {
  try {
    await client.connect();
    const database = client.db("PBL6");
    const usersCollection = database.collection("users");

    const user = await usersCollection.findOne({ email: email });

    if (!user) {
      // Status 404 if user not found
      return {
        success: false,
        message: "Invalid email or password.",
        status: 404,
        user: null,
      };
    }

    const hashedPassword = user.password;
    const status = user.status;
    const is_verified = user.is_verified;

    if (status !== USER_STATUS.ACTIVE) {
      // Status 403 if account is inactive
      return {
        success: false,
        message: "Your account is inactive. Please contact support.",
        status: 403,
        user: null,
      };
    }

    if (is_verified !== USER_VERIFICATION.VERIFIED) {
      // Status 403 if account is not verified
      return {
        success: false,
        message: "Please verify your email before logging in.",
        status: 403,
        user: null,
      };
    }

    const passwordMatch = await bcrypt.compare(password, hashedPassword);
    if (passwordMatch) {
      // Status 200 for successful login
      return {
        success: true,
        message: "Login successful!",
        status: 200,
        user: user,
      };
    } else {
      // Status 401 for invalid password
      return {
        success: false,
        message: "Invalid email or password.",
        status: 401,
        user: null,
      };
    }
  } catch (err) {
    console.error(err);
    // Status 500 for internal server errors
    return {
      success: false,
      message: "Error logging in.",
      status: 500,
      user: null,
    };
  } finally {
    await client.close();
  }
}

async function sendVerificationEmail(email, link) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "khongquen012@gmail.com",
      pass: "zoijiuykwjnueeju",
    },
  });

  const mailOptions = {
    from: "khongquen012@gmail.com",
    to: email,
    subject: "Xác minh tài khoản Whiskers",
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

          <p>Chào mừng bạn đến với Whiskers! Để hoàn tất quá trình đăng ký và xác minh tài khoản, vui lòng nhấn vào nút dưới đây.</p>

          <!-- Căn giữa nút -->
          <div class="btn-container">
            <a href="${link}" target="_blank" class="btn">Xác minh tài khoản</a>
          </div>

          <p class="footer">
            Nếu bạn gặp vấn đề với nút trên, bạn cũng có thể sao chép và dán liên kết dưới đây:
          </p>
          <p class="footer">
            <a href="${link}" target="_blank">${link}</a>
          </p>
        </div>

      </body>
    </html>`,
  };

  await transporter.sendMail(mailOptions);
}

async function resendVerificationEmail(userId, email) {
  try {
    await client.connect();
    const database = client.db("PBL6");
    const usersCollection = database.collection("users");

    // Fetch the last resend time
    const user = await usersCollection.findOne({ _id: userId });

    if (!user) {
      return { success: false, message: "User not found." };
    }

    const now = new Date();
    const RESEND_LIMIT = 60 * 1000; // 5 minutes in milliseconds

    if (user.token_created_at && now - user.token_created_at < RESEND_LIMIT) {
      const waitTime = Math.ceil(
        (RESEND_LIMIT - (now - user.token_created_at)) / 1000
      );
      return {
        success: false,
        message: `Vui lòng chờ ${waitTime} giây để gửi lại email xác mình mới`,
      };
    }

    // Generate a new token and send verification email
    const token = jwt.sign({ userId, email }, SECRET_KEY, { expiresIn: "1h" });
    const userToken = process.env.PREFIX_VERIFY_TOKEN + userId;
    await redis.set(userToken, token, {
      EX: 60 * 60,
    });
    const verificationLink = `${process.env.END_USER_URL}/email-confirm?token=${token}`;

    await sendVerificationEmail(email, verificationLink);

    // Update token_created_at in the database
    await usersCollection.updateOne(
      { _id: userId },
      { $set: { token_created_at: now } }
    );

    return {
      success: true,
      message: "A new verification email has been sent.",
    };
  } catch (err) {
    console.error(err);
    return { success: false, message: "Error resending verification email." };
  } finally {
    await client.close();
  }
}

async function verifyEmail(token) {
  try {
    // console.log(token);
    const decoded = jwt.verify(token, SECRET_KEY);
    await client.connect();
    const database = client.db("PBL6");
    const usersCollection = database.collection("users");
    // Find user by ID in MongoDB
    // console.log(decoded);

    const user = await usersCollection.findOne({ _id: decoded.userId });

    if (!user) {
      return { success: false, message: "User not found." };
    }

    const tokenCreatedAt = new Date(user.token_created_at);
    const now = new Date();
    const tokenExpirationTime = 60 * 60 * 1000; // 1 hour in milliseconds

    // Check if token has expired
    if (now - tokenCreatedAt > tokenExpirationTime) {
      return {
        success: false,
        message:
          "Verification token has expired. Please request a new verification email.",
      };
    }

    return { success: true, message: "Please set your new password!" };
  } catch (err) {
    console.error(err);

    // Handle token expiration error
    if (err.name === "TokenExpiredError") {
      return {
        success: false,
        message:
          "Verification token has expired. Please request a new verification email.",
      };
    }

    return { success: false, message: "Error verifying email." };
  }
}

function generateToken(userId, isRememberMe, id_role) {
  const expiresIn = isRememberMe ? "30d" : "1h"; // 30 ngày hoặc 1 giờ
  return jwt.sign({ userId, id_role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn });
}

module.exports = {
  registerUser,
  loginUser,
  verifyEmail,
  generateToken,
};
