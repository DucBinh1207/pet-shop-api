const { USER_STATUS, USER_VERIFICATION } = require('../status_constant/users_status');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require('uuid');
const { sql, poolPromise } = require('../db');
const nodemailer = require('nodemailer');
const SECRET_KEY = '0f5f43b5b226531628722a0f20b4c276de87615dfc8516ea4240c93f4135d4b1';
const REFRESH_TOKEN_SECRET = '3b0e8e94c2f7f5f6c5b7c3f1ab9b8f59a1c60b2d0b3b5e2d67a1c46f7e53ff19';
const { client } = require('../db')

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
        return { success: false, message: 'User already registered and verified.' };
      } else {
        const resend_result = await resendVerificationEmail(user._id, user.email);
        return { success: resend_result.success, message: resend_result.message };
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
      is_verified: false
    };

    await usersCollection.insertOne(newUser);

    const token = jwt.sign({ userId, email }, SECRET_KEY, { expiresIn: '1h' });
    const verificationLink = `${process.env.END_USER_URL}/reset-password?token=${token}`;
    await sendVerificationEmail(email, verificationLink);

    return { success: true, message: 'User registered successfully! Please verify your email.' };
  } catch (err) {
    console.error(err);
    return { success: false, message: 'Error registering user.' };
  } finally {
    await client.close();
  }
}

// Compare the password for login
async function loginUser(email, password) {
  try {
    await client.connect();
    const database = client.db('PBL6');
    const usersCollection = database.collection('users');

    const user = await usersCollection.findOne({ email: email });

    if (!user) {
      // Status 404 if user not found
      return { success: false, message: 'Invalid email or password.', status: 404, user: null };
    }

    const hashedPassword = user.password;
    const status = user.status;
    const is_verified = user.is_verified;

    if (status !== USER_STATUS.ACTIVE) {
      // Status 403 if account is inactive
      return { success: false, message: 'Your account is inactive. Please contact support.', status: 403, user: null };
    }

    if (is_verified !== USER_VERIFICATION.VERIFIED) {
      // Status 403 if account is not verified
      return { success: false, message: 'Please verify your email before logging in.', status: 403, user: null };
    }

    const passwordMatch = await bcrypt.compare(password, hashedPassword);
    if (passwordMatch) {
      // Status 200 for successful login
      return { success: true, message: 'Login successful!', status: 200, user: user };
    } else {
      // Status 401 for invalid password
      return { success: false, message: 'Invalid email or password.', status: 401, user: null };
    }
  } catch (err) {
    console.error(err);
    // Status 500 for internal server errors
    return { success: false, message: 'Error logging in.', status: 500, user: null };
  } finally {
    await client.close();
  }
}

async function sendVerificationEmail(email, link) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
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
    await client.connect();
    const database = client.db("PBL6");
    const usersCollection = database.collection("users");

    // Fetch the last resend time
    const user = await usersCollection.findOne({ _id: userId });

    if (!user) {
      return { success: false, message: 'User not found.' };
    }

    const now = new Date();
    const RESEND_LIMIT = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (user.token_created_at && now - user.token_created_at < RESEND_LIMIT) {
      const waitTime = Math.ceil((RESEND_LIMIT - (now - user.token_created_at)) / 1000);
      return { success: false, message: `Please wait ${waitTime} seconds before requesting a new verification email.` };
    }

    // Generate a new token and send verification email
    const token = jwt.sign({ userId, email }, SECRET_KEY, { expiresIn: '1h' });
    const verificationLink = `http://localhost:8000/api/auth/verify-email?token=${token}`;

    await sendVerificationEmail(email, verificationLink);

    // Update token_created_at in the database
    await usersCollection.updateOne({ _id: userId }, { $set: { token_created_at: now } });

    return { success: true, message: 'A new verification email has been sent.' };
  } catch (err) {
    console.error(err);
    return { success: false, message: 'Error resending verification email.' };
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
        message: "Verification token has expired. Please request a new verification email.",
      };
    }

    return { success: true, message: "Please set your new password!" };
  } catch (err) {
    console.error(err);

    // Handle token expiration error
    if (err.name === "TokenExpiredError") {
      return {
        success: false,
        message: "Verification token has expired. Please request a new verification email.",
      };
    }
    
    return { success: false, message: "Error verifying email." };
  }
}

function generateTokens(userId, isRememberMe) {
  const accessToken = jwt.sign({ id: userId }, SECRET_KEY, {
    expiresIn: '1h', // Access token expires in 1 hour
  });

  const refreshTokenExpiry = isRememberMe ? '30d' : '2d';
  const refreshToken = jwt.sign({ id: userId }, REFRESH_TOKEN_SECRET, {
    expiresIn: refreshTokenExpiry, // 30d if "Remember Me" is true, otherwise 2d
  });

  return { accessToken, refreshToken };
}

module.exports = {
  registerUser,
  loginUser,
  verifyEmail,
  generateTokens
};
