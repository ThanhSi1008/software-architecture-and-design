const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  genre: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  posterUrl: {
    type: String
  },
  showtime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['UPCOMING', 'SHOWING', 'CLOSED'],
    default: 'SHOWING'
  },
  totalSeats: {
    type: Number,
    required: true
  },
  availableSeats: {
    type: Number,
    required: true
  },
  bookedSeats: {
    type: [String],
    default: []
  },
  price: {
    type: Number,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Movie', movieSchema);
