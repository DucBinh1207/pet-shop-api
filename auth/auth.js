const { USER_STATUS, USER_VERIFICATION } = require('../status_constant/users_status');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require('uuid');
const { sql, poolPromise } = require('../db');
const nodemailer = require('nodemailer');
const SECRET_KEY = '0f5f43b5b226531628722a0f20b4c276de87615dfc8516ea4240c93f4135d4b1';

// Hash the password for registration
async function registerUser(email, password, id_role) {
  try {
    const pool = await poolPromise;

    // Check if the email is already registered
    const checkQuery = `SELECT * FROM users WHERE email = @Email`;
    const userResult = await pool.request()
      .input('Email', sql.VarChar, email)
      .query(checkQuery);

    if (userResult.recordset.length > 0) {
      const user = userResult.recordset[0];

      if (user.is_verified) {
        return { success: false, message: 'User already registered and verified.' };
      } else {
        const resend_result = await resendVerificationEmail(user.id, user.email);
        return { success: resend_result.success, message: resend_result.message };
        // return { success: true, message: 'User already registered but not verified. Please check your email.' };
      }
    }

    const userId = uuidv4();

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const tokenCreatedAt = new Date(); 

    const query = `INSERT INTO users (id, email, password, id_role, token_created_at) VALUES (@id, @email, @password, @id_role, @token_created_at)`;

    await pool.request()
      .input('id', sql.VarChar, userId)
      .input('email', sql.VarChar, email)
      .input('password', sql.VarChar, hashedPassword)
      .input('id_role', sql.BigInt, 1)
      .input('token_created_at', sql.DateTime2, tokenCreatedAt)
      .query(query);

    const token = jwt.sign({ userId, email }, SECRET_KEY, { expiresIn: '1h' });
    const verificationLink = `http://localhost:8000/api/verify-email?token=${token}`;
    await sendVerificationEmail(email, verificationLink);

    return { success: true, message: 'User registered successfully! Please verify your email.' };
    // return { success: true, message: 'User registered successfully!' };
  } catch (err) {
    console.error(err);
    return { success: false, message: 'Error registering user.' };
  }
}

// Compare the password for login
async function loginUser(email, password) {
  try {
    const pool = await poolPromise;
    const query = `SELECT * FROM users WHERE email = @email`;
    
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query(query);
    
    const user = result.recordset[0];
    if (!user) {
        return { success: false, message: 'Invalid email or password.', user: null };
    }

    const hashedPassword = user.password;
    const status = user.status;
    const is_verified = user.is_verified;

    if (status !== USER_STATUS.ACTIVE) {
        return { success: false, message: 'Your account is inactive. Please contact support.', user: null };
    }

    if (is_verified !== USER_VERIFICATION.VERIFIED) {
        return { success: false, message: 'Please verify your email before logging in.', user: null };
    }

    const passwordMatch = await bcrypt.compare(password, hashedPassword);
    if (passwordMatch) {
      return { success: true, message: 'Login successful!', user: result.recordset[0] };
    } else {
      return { success: false, message: 'Invalid email or password.', user: null };
    }
  } catch (err) {
    console.error(err);
    return { success: false, message: 'Error logging in.', user: null };
  }
}

async function sendVerificationEmail(email, link) {
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or any email provider you use
      auth: {
        user: 'khongquen012@gmail.com',
        pass: 'zoijiuykwjnueeju'
      }
    });
  
    const mailOptions = {
      from: 'khongquen012@gmail.com',
      to: email,
      subject: 'Verify your email address',
      text: `Click the link to verify your email: ${link}`
    };
  
    await transporter.sendMail(mailOptions);
}

async function resendVerificationEmail(userId, email) {
    try {
      const pool = await poolPromise;
  
      // Fetch the last resend time
      const query = `SELECT token_created_at FROM users WHERE id = @UserId`;
      const userResult = await pool.request()
        .input('UserId', sql.VarChar, userId)
        .query(query);
  
      if (userResult.recordset.length === 0) {
        return { success: false, message: 'User not found.' };
      }
  
      const user = userResult.recordset[0];
      const now = new Date();
      
      // Define rate limiting time (e.g., 5 minutes)
      const RESEND_LIMIT = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      if (user.token_created_at && now - user.token_created_at < RESEND_LIMIT) {
        const waitTime = Math.ceil((RESEND_LIMIT - (now - user.token_created_at)) / 1000);
        return { success: false, message: `Please wait ${waitTime} seconds before requesting a new verification email.` };
      }
  
      // Generate a new token and send verification email
      const token = jwt.sign({ userId, email }, SECRET_KEY, { expiresIn: '1h' });
      const verificationLink = `http://localhost:8000/api/verify-email?token=${token}`;
  
      await sendVerificationEmail(email, verificationLink);
  
      // Update token_created_at in the database
      const updateQuery = `UPDATE users SET token_created_at = @token_created_at WHERE id = @UserId`;
      await pool.request()
        .input('token_created_at', sql.DateTime2, now)
        .input('UserId', sql.VarChar, userId)
        .query(updateQuery);
  
      return { success: true, message: 'A new verification email has been sent.' };
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Error resending verification email.' };
    }
}
  

module.exports = {
  registerUser,
  loginUser
};
