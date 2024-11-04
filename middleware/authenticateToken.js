const authenticateToken = (req, res, next) => {
  const token =
    req.headers["authorization"] && req.headers["authorization"].split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" }); // Không có token

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      // Kiểm tra xem lỗi có phải là do token hết hạn hay không
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token has expired" }); // Token hết hạn
      }
      return res.status(401).json({ message: "Invalid token" }); // Token không hợp lệ
    }
    req.user = user; // Lưu thông tin người dùng vào request
    req.token = token;
    next();
  });
};

module.exports = { authenticateToken };
