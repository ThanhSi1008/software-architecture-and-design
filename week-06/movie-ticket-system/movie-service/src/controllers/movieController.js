const Movie = require('../models/Movie');
const { createLogger } = require('../../../shared/logger');

const logger = createLogger('MOVIE-SERVICE');

exports.getAllMovies = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    
    const movies = await Movie.find(filter).sort({ showtime: 1 });
    
    res.status(200).json({
      success: true,
      data: movies
    });
  } catch (error) {
    logger.error('GET_ALL', error.message);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

exports.getMovieById = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phim.' });
    }
    
    res.status(200).json({
      success: true,
      data: movie
    });
  } catch (error) {
    logger.error('GET_BY_ID', error.message);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

exports.createMovie = async (req, res) => {
  try {
    const { title, genre, duration, showtime, totalSeats, price, description, posterUrl } = req.body;
    
    if (!title || !genre || !duration || !showtime || !totalSeats || !price) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin bắt buộc.' });
    }
    
    const newMovie = new Movie({
      title,
      description,
      genre,
      duration,
      posterUrl,
      showtime,
      totalSeats,
      availableSeats: totalSeats,
      price
    });
    
    await newMovie.save();
    logger.info('CREATE', `Movie created: ${newMovie._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Thêm phim thành công',
      data: newMovie
    });
  } catch (error) {
    logger.error('CREATE', error.message);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

exports.updateMovie = async (req, res) => {
  try {
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!movie) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phim.' });
    }
    
    logger.info('UPDATE', `Movie updated: ${movie._id}`);
    res.status(200).json({
      success: true,
      message: 'Cập nhật phim thành công',
      data: movie
    });
  } catch (error) {
    logger.error('UPDATE', error.message);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};
