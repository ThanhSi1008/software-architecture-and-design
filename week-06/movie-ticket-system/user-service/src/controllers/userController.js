const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectBroker, publishEvent } = require('../../../shared/broker');
const { USER_REGISTERED } = require('../../../shared/events');
const { createLogger } = require('../../../shared/logger');

const logger = createLogger('USER-SERVICE');
let rabbitChannel;

// Kết nối RabbitMQ
const initBroker = async () => {
  try {
    const { channel } = await connectBroker(process.env.RABBITMQ_URL);
    rabbitChannel = channel;
  } catch (err) {
    logger.error('BROKER', `Failed to initialize broker: ${err.message}`);
  }
};
initBroker();

exports.register = async (req, res) => {
  try {
    const { username, email, password, fullName, role } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ username, email và password.' });
    }

    // Check existing user
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username hoặc Email đã tồn tại.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (Chỉ cho phép role ADMIN nếu cần thiết, bình thường là USER)
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      fullName,
      role: role && ['USER', 'ADMIN'].includes(role) ? role : 'USER'
    });
    await newUser.save();

    logger.info('REGISTER', `User created: ${newUser._id}`);

    // Publish event
    const payload = {
      userId: newUser._id,
      username: newUser.username,
      email: newUser.email
    };

    if (rabbitChannel) {
      await publishEvent(rabbitChannel, USER_REGISTERED, payload);
    } else {
      logger.error('PUBLISH', 'RabbitMQ channel is not available. Event not sent.');
    }

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: { userId: newUser._id, username: newUser.username, role: newUser.role }
    });

  } catch (error) {
    logger.error('REGISTER', error.message);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email và password.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng.' });
    }

    // Tạo JWT Token
    const payload = {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    logger.info('LOGIN', `User logged in: ${user._id}`);

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        userId: user._id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    logger.error('LOGIN', error.message);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};
