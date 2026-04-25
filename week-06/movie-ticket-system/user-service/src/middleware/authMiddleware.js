const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied. Không tìm thấy token.' });
  }

  try {
    // Expect format: "Bearer <token>"
    const tokenStr = token.startsWith('Bearer ') ? token.slice(7) : token;
    const verified = jwt.verify(tokenStr, process.env.JWT_SECRET);
    req.user = verified; // { userId, username, email, role }
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};
