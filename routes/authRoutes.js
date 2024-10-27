// routes/authRoutes.js

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { loginUser, registerUser, verifyEmail, generateTokens } = require("../auth/auth");
// const { sql, poolPromise } = require("../db");
const router = express.Router();
const { USER_STATUS, USER_VERIFICATION } = require('../status_constant/users_status');
const { client } = require('../db')
const nodemailer = require('nodemailer');

const SECRET_KEY =
  "0f5f43b5b226531628722a0f20b4c276de87615dfc8516ea4240c93f4135d4b1";

router.post('/login', async (req, res) => {
  const { email, password, isRememberMe } = req.body; // Add isRememberMe to the request body

  try {
    const result = await loginUser(email, password);

    // Handle various success and failure cases
    if (result.success) {
      const user = result.user;

      // Generate access and refresh tokens
      const { accessToken, refreshToken } = generateTokens(user._id, isRememberMe);

      // Set refresh token as an HTTP-only cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
        sameSite: 'Strict', // Prevent CSRF attacks
        maxAge: isRememberMe ? 30 * 24 * 60 * 60 * 1000 : 2 * 24 * 60 * 60 * 1000, // 30d or 2d in milliseconds
      });

      // Send response with access token and user data
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
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post("/register", async (req, res) => {
  const { email, id_role } = req.body;

  try {
    const result = await registerUser(email, id_role);

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

// router.get("/verify-email", async (req, res) => {
//   const token = req.query.token;

//   try {
//     const result = await verifyEmail(token);
//     const decoded = jwt.verify(token, SECRET_KEY);
//     if (result.success) {
//       res.redirect(`/create-new-password?email=${decoded.email}`);

//       res.status(201).json({ message: result.message });
//     } else {
//       res.status(401).json({ message: result.message });
//     }
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

router.get("/verify-email", async (req, res) => {
  const token = req.query.token;

  try {
    const decoded = jwt.verify(token, SECRET_KEY);  // Verify token
    const { userId, email } = decoded;

    await client.connect();
    const database = client.db("PBL6");
    const usersCollection = database.collection("users");

    // Find the user by ID and email
    const user = await usersCollection.findOne({ _id: userId, email: email });

    if (!user || user.is_verified) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    // Update the user as verified
    await usersCollection.updateOne({ _id: userId }, { $set: { is_verified: true, status: USER_STATUS.ACTIVE } });

    // Generate a token for setting the password
    const passwordToken = jwt.sign({ userId }, SECRET_KEY, { expiresIn: '1h' });

    res.status(200).json({ token: passwordToken, message: "Email verified! You can now set your password." });

    // Optionally, you can redirect the user to a password-setting page:
    // res.redirect(`/set-password?userId=${userId}`);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Invalid or expired token." });
  } finally {
    await client.close();
  }
});

// router.post("/verify-token", async (req, res) => {
//   const token = req.query.token;

//   try {
//     // const result = await verifyEmail(token);
//     const decoded = jwt.verify(token, SECRET_KEY);

//     // if (result.success) {
//     //   // Redirect to reset password page with email
//     //   // res.redirect(`/api/auth/reset-password?token=${token}`);
//     //   res.status(201).json({ message: result.message });
//     // } else {
//     //   res.status(401).json({ message: result.message });
//     // }
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

router.post("/verify-token", async (req, res) => {
  const token = req.query.token; // Use query parameter or request body for token

  try {
    // Verify the token using JWT
    const decoded = jwt.verify(token, SECRET_KEY);

    // If the token is valid, return success along with decoded data (like user ID or email)
    res.status(200).json({
      success: true,
      message: "Token is valid.",
      userId: decoded.userId,  // Assuming the token contains userId
      email: decoded.email     // Assuming the token contains email
    });
  } catch (err) {
    // Handle different types of JWT errors
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please request a new token."
      });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: "Invalid token."
      });
    } else {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Internal server error."
      });
    }
  }
});

// router.post("/reset-password", async (req, res) => {
//   const { newPassword } = req.body;
//   const token = req.query.token;

//   try {
//     const decoded = jwt.verify(token, SECRET_KEY);

//     const saltRounds = 10;
//     const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

//     await client.connect();
//     const database = client.db("PBL6");
//     const usersCollection = database.collection("users");

//     // Update password in MongoDB
//     const updateResult = await usersCollection.updateOne(
//       { _id: decoded.userId },
//       { $set: { password: hashedPassword, status: USER_STATUS.ACTIVE, is_verified: USER_VERIFICATION.VERIFIED } } // Update status to active
//     );

//     if (updateResult.modifiedCount === 1) {
//       res.status(200).json({ success: true, message: "Password reset successfully!" });
//     } else {
//       res.status(404).json({ success: false, message: "User not found." });
//     }
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Error resetting password." });
//   } finally {
//     await client.close();
//   }
// });

router.post("/set-password", async (req, res) => {
  const authHeader = req.headers.authorization;  // Get the Authorization header

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing or invalid.' });
  }

  const token = authHeader.split(' ')[1];  // Extract the token from 'Bearer <token>'
  const { newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.userId;

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await client.connect();
    const database = client.db("PBL6");
    const usersCollection = database.collection("users");

    await usersCollection.updateOne(
      { _id: userId },
      { $set: { password: hashedPassword, status: USER_STATUS.ACTIVE } }
    );

    res.status(200).json({ message: "Password set successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error setting password." });
  } finally {
    await client.close();
  }
});

router.post('/request-password-reset', async (req, res) => {
  const { email } = req.body;

  try {
      await client.connect();
      const database = client.db('PBL6');
      const usersCollection = database.collection('users');
      
      const user = await usersCollection.findOne({ email });
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Generate reset token
      const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: '1h' });

      // Store the token in MongoDB with the user
      await usersCollection.updateOne(
          { _id: user._id },
          { $set: { resetToken: token } }
      );
      
      // Send reset password email
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'khongquen012@gmail.com',
          pass: 'zoijiuykwjnueeju'
        }
      });
      
      const resetLink = `http://localhost:8000/api/auth/reset-password?token=${token}`;
      
      const mailOptions = {
        from: 'khongquen012@gmail.com',
        to: email,
        subject: 'Password Reset Request',
        text: `Click the link to reset your password: ${resetLink}`,
      };
      
      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: 'Reset password link sent to your email' });
  } catch (error) {
      res.status(500).json({ message: 'Server error', error });
  } finally {
      await client.close();
  }
});

router.post('/reset-password', async (req, res) => {
  const { token } = req.query;
  const { password } = req.body;

  try {
      const decoded = jwt.verify(token, SECRET_KEY);

      await client.connect();
      const database = client.db('PBL6');
      const usersCollection = database.collection('users');
      
      const user = await usersCollection.findOne({ _id: decoded.id, resetToken: token });
      if (!user) {
          return res.status(400).json({ message: 'Invalid or expired token' });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user's password and clear resetToken
      await usersCollection.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword }, $unset: { resetToken: "" } }
      );

      res.status(200).json({ message: 'Password successfully reset' });
  } catch (error) {
      res.status(400).json({ message: 'Error resetting password', error });
  } finally {
      await client.close();
  }
});

// Route Hello World
router.get("/test", (req, res) => {
  res.json({ message: "Hello, World!" });
});

module.exports = router;