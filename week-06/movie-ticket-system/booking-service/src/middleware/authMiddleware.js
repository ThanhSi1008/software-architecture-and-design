const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied. Cần đăng nhập để thực hiện.' });
  }

  try {
    const tokenStr = token.startsWith('Bearer ') ? token.slice(7) : token;
    const verified = jwt.verify(tokenStr, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Phiên làm việc hết hạn.' });
  }
};
