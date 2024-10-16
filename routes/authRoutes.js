// routes/authRoutes.js

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { registerUser, loginUser } = require("../auth/auth");
const { sql, poolPromise } = require("../db");
const router = express.Router();

const SECRET_KEY =
  "0f5f43b5b226531628722a0f20b4c276de87615dfc8516ea4240c93f4135d4b1";

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await loginUser(email, password);

    if (result.success) {
      const user = result.user;
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          id_role: user.id_role,
          telephone_number: user.telephone_number,
          nationality: user.nationality,
          province: user.province,
          district: user.district,
          ward: user.ward,
          street: user.street,
          image: user.image,
        },
        SECRET_KEY,
        { expiresIn: "1h" }
      );

      res.json({
        token: token,
        email: user.email,
        id_role: user.id_role,
      });
    } else {
      res.status(401).json({ message: result.message });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/register", async (req, res) => {
  const { email, password, id_role } = req.body;

  try {
    const result = await registerUser(email, password, id_role);

    if (result.success) {
      res.status(201).json({ message: result.message });
    } else {
      res.status(401).json({ message: result.message });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/verify-email", async (req, res) => {
  const token = req.query.token;

  try {
    const result = await verifyEmail(token);

    if (result.success) {
      res.status(201).json({ message: result.message });
    } else {
      res.status(401).json({ message: result.message });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

async function verifyEmail(token) {
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const pool = await poolPromise;
    const query = `SELECT * FROM users WHERE id = @UserId`;

    const userResult = await pool
      .request()
      .input("UserId", sql.VarChar, decoded.id) // Thay đổi từ 'userId' sang 'id' cho phù hợp
      .query(query);

    if (userResult.recordset.length === 0) {
      return { success: false, message: "User not found." };
    }

    const user = userResult.recordset[0];
    const tokenCreatedAt = new Date(user.token_created_at);
    const now = new Date();
    const tokenExpirationTime = 60 * 60 * 1000; // 1 giờ trong mili giây

    if (now - tokenCreatedAt > tokenExpirationTime) {
      return {
        success: false,
        message:
          "Verification token has expired. Please request a new verification email.",
      };
    }

    const updateQuery = `UPDATE users SET is_verified = 1 WHERE id = @UserId`;
    await pool
      .request()
      .input("UserId", sql.VarChar, user.id)
      .query(updateQuery);

    return { success: true, message: "Email verified successfully!" };
  } catch (err) {
    console.error(err);
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

// Route Hello World
router.get("/test", (req, res) => {
  res.json({ message: "Hello, World!" });
});

module.exports = router;
