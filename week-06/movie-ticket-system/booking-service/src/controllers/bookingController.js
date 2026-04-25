const axios = require('axios');
const Booking = require('../models/Booking');
const { connectBroker, publishEvent } = require('../../../shared/broker');
const { BOOKING_CREATED } = require('../../../shared/events');
const { createLogger } = require('../../../shared/logger');

const logger = createLogger('BOOKING-SERVICE');
let rabbitChannel;

const initBroker = async () => {
  try {
    const { channel } = await connectBroker(process.env.RABBITMQ_URL);
    rabbitChannel = channel;
  } catch (err) {
    logger.error('BROKER', `Failed to initialize: ${err.message}`);
  }
};
initBroker();

exports.createBooking = async (req, res) => {
  try {
    const { movieId, seats, seatDetails } = req.body;
    const { userId, username, email } = req.user;

    if (!movieId || !seats || seats <= 0) {
      return res.status(400).json({ success: false, message: 'Thông tin đặt vé không hợp lệ.' });
    }

    // 1. Gọi Movie Service để verify phim
    let movieResponse;
    try {
      movieResponse = await axios.get(`${process.env.MOVIE_SERVICE_URL}/api/movies/${movieId}`);
    } catch (err) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phim hoặc Movie Service không khả dụng.' });
    }

    const movie = movieResponse.data.data;

    // 2. Kiểm tra ghế trống và trùng ghế
    const requestedSeats = seatDetails ? seatDetails.split(',').map(s => s.trim()) : [];
    const alreadyBooked = requestedSeats.filter(s => movie.bookedSeats?.includes(s));

    if (alreadyBooked.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Ghế ${alreadyBooked.join(', ')} đã có người đặt. Vui lòng chọn ghế khác.` 
      });
    }

    if (movie.availableSeats < seats) {
      return res.status(400).json({ success: false, message: `Xin lỗi, chỉ còn ${movie.availableSeats} ghế trống.` });
    }

    // 3. Tạo Booking PENDING
    const totalPrice = movie.price * seats;
    const newBooking = new Booking({
      userId,
      username,
      email,
      movieId,
      movieTitle: movie.title,
      showtime: movie.showtime,
      posterUrl: movie.posterUrl,
      seats,
      seatDetails,
      totalPrice,
      status: 'PENDING'
    });

    await newBooking.save();
    logger.info('CREATE', `Booking created: ${newBooking._id}`);

    // 4. Publish Event
    const payload = {
      bookingId: newBooking._id,
      userId,
      username,
      email,
      movieId,
      movieTitle: movie.title,
      seats,
      seatDetails,
      totalPrice
    };

    if (rabbitChannel) {
      await publishEvent(rabbitChannel, BOOKING_CREATED, payload);
    }

    res.status(201).json({
      success: true,
      message: 'Đặt vé thành công, đang chờ thanh toán...',
      data: newBooking
    });

  } catch (error) {
    logger.error('CREATE', error.message);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi đặt vé.' });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy vé.' });
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};
