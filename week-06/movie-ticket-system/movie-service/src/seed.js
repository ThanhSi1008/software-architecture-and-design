const mongoose = require('mongoose');
const Movie = require('./models/Movie');
const dotenv = require('dotenv');

dotenv.config();

const movies = [
  {
    title: "Avengers: Endgame",
    description: "Sau những sự kiện tàn khốc của Avengers: Infinity War (2018), vũ trụ đang bị hủy hoại.",
    genre: "Hành động",
    duration: 181,
    posterUrl: "https://example.com/avengers.jpg",
    showtime: new Date("2026-05-01T20:00:00Z"),
    status: "SHOWING",
    totalSeats: 100,
    availableSeats: 100,
    price: 150000
  },
  {
    title: "Spider-Man: No Way Home",
    description: "Lần đầu tiên trong lịch sử điện ảnh của Người Nhện, danh tính của người anh hùng thân thiện hàng xóm của chúng ta bị bại lộ.",
    genre: "Hành động",
    duration: 148,
    posterUrl: "https://example.com/spiderman.jpg",
    showtime: new Date("2026-05-02T19:00:00Z"),
    status: "SHOWING",
    totalSeats: 80,
    availableSeats: 80,
    price: 120000
  },
  {
    title: "Inception",
    description: "Một kẻ trộm đánh cắp bí mật của công ty thông qua việc sử dụng công nghệ chia sẻ giấc mơ.",
    genre: "Khoa học viễn tưởng",
    duration: 148,
    posterUrl: "https://example.com/inception.jpg",
    showtime: new Date("2026-05-03T21:00:00Z"),
    status: "SHOWING",
    totalSeats: 120,
    availableSeats: 120,
    price: 100000
  },
  {
    title: "Your Name",
    description: "Hai người xa lạ nhận thấy mình được kết nối theo một cách kỳ lạ.",
    genre: "Hoạt hình",
    duration: 106,
    posterUrl: "https://example.com/yourname.jpg",
    showtime: new Date("2026-05-04T18:00:00Z"),
    status: "UPCOMING",
    totalSeats: 60,
    availableSeats: 60,
    price: 80000
  },
  {
    title: "Parasite",
    description: "Tham vọng và sự phân biệt đối xử đe dọa mối quan hệ cộng sinh mới được hình thành giữa gia đình Park giàu có và gia đình Kim nghèo khó.",
    genre: "Kịch tính",
    duration: 132,
    posterUrl: "https://example.com/parasite.jpg",
    showtime: new Date("2026-04-20T19:30:00Z"),
    status: "CLOSED",
    totalSeats: 50,
    availableSeats: 0,
    price: 90000
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Movie.deleteMany();
    await Movie.insertMany(movies);
    console.log("[MOVIE-SERVICE] Seed data successfully!");
    process.exit();
  } catch (err) {
    console.error("[MOVIE-SERVICE] Seed error:", err);
    process.exit(1);
  }
};

seedDB();
