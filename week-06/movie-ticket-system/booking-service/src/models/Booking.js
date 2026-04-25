const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
  movieId: { type: String, required: true, index: true },
  movieTitle: { type: String, required: true },
  showtime: { type: Date, required: true },
  posterUrl: { type: String },
  seats: { type: Number, required: true },
  seatDetails: { type: String },
  totalPrice: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED'], 
    default: 'PENDING' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
