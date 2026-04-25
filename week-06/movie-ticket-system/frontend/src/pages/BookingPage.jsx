import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ChevronLeft, Info, Armchair, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BookingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [movie, setMovie] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingStatus, setBookingStatus] = useState('IDLE'); // IDLE, PROCESSING, SUCCESS, FAILED
  const [bookingId, setBookingId] = useState(null);

  // Tạo sơ đồ ghế A1-G9
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const cols = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const res = await api.get(`/movies/${id}`);
        setMovie(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  useEffect(() => {
    let interval;
    if (bookingStatus === 'PROCESSING' && bookingId) {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`/bookings/${bookingId}`);
          const status = res.data.data.status;
          if (status === 'CONFIRMED') {
            setBookingStatus('SUCCESS');
            clearInterval(interval);
          } else if (status === 'FAILED') {
            setBookingStatus('FAILED');
            clearInterval(interval);
          }
        } catch (err) {
          console.error(err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [bookingStatus, bookingId]);

  const toggleSeat = (seat) => {
    if (selectedSeats.includes(seat)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seat));
    } else {
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const handleBooking = async () => {
    if (!user) return navigate('/login');
    if (selectedSeats.length === 0) return alert('Vui lòng chọn ít nhất 1 ghế');
    
    setBookingStatus('PROCESSING');
    try {
      const res = await api.post('/bookings', { 
        movieId: id, 
        seats: selectedSeats.length,
        seatDetails: selectedSeats.join(', ') 
      });
      setBookingId(res.data.data._id);
    } catch (err) {
      setBookingStatus('FAILED');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={48} /></div>;
  if (!movie) return <div className="pt-32 text-center text-2xl font-bold">Không tìm thấy phim</div>;

  return (
    <div className="min-h-screen pt-28 pb-20 px-6 max-w-6xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/50 hover:text-white mb-8 group">
        <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
        <span>Quay lại</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left: Movie Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 aspect-[2/3]">
            <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold">{movie.title}</h1>
          <div className="glass p-5 rounded-2xl space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Thể loại</span>
              <span>{movie.genre}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Thời lượng</span>
              <span>{movie.duration} phút</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Giá vé</span>
              <span className="text-primary font-bold">{movie.price.toLocaleString('vi-VN')} VNĐ</span>
            </div>
          </div>
        </div>

        {/* Right: Seat Map */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass p-8 rounded-3xl relative overflow-hidden">
            {/* Screen */}
            <div className="w-full h-2 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full mb-16 shadow-[0_10px_20px_rgba(99,102,241,0.5)]"></div>
            <p className="text-center text-xs text-white/30 uppercase tracking-[0.5em] -mt-12 mb-12">Màn hình</p>

            {/* Grid */}
            <div className="grid grid-cols-9 gap-3 max-w-md mx-auto">
              {rows.map(row => (
                cols.map(col => {
                  const seatId = `${row}${col}`;
                  const isSelected = selectedSeats.includes(seatId);
                  const isBooked = movie.bookedSeats?.includes(seatId);

                  return (
                    <button
                      key={seatId}
                      disabled={isBooked}
                      onClick={() => toggleSeat(seatId)}
                      className={`
                        aspect-square rounded-md text-[10px] font-bold transition-all duration-300
                        ${isBooked 
                          ? 'bg-gray-700 text-white/20 cursor-not-allowed opacity-50' 
                          : isSelected 
                            ? 'bg-vibrant text-white scale-110 shadow-lg shadow-primary/40' 
                            : 'bg-white/5 border border-white/10 text-white/40 hover:border-primary/50'}
                      `}
                    >
                      {seatId}
                    </button>
                  );
                })
              ))}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-8 mt-12 text-sm text-white/50">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white/5 border border-white/10 rounded"></div>
                <span>Trống</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-vibrant rounded"></div>
                <span>Đã chọn</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-700 rounded cursor-not-allowed"></div>
                <span>Đã đặt</span>
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="glass p-8 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-1 text-center md:text-left">
              <p className="text-white/50">Ghế đã chọn: <span className="text-white font-bold">{selectedSeats.join(', ') || 'Chưa chọn'}</span></p>
              <p className="text-3xl font-bold text-gradient">{(movie.price * selectedSeats.length).toLocaleString('vi-VN')} VNĐ</p>
            </div>
            <button 
              onClick={handleBooking}
              disabled={selectedSeats.length === 0 || bookingStatus === 'PROCESSING'}
              className="bg-vibrant px-12 py-4 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 min-w-[200px]"
            >
              {bookingStatus === 'PROCESSING' ? <Loader2 className="animate-spin mx-auto" /> : 'Thanh Toán Ngay'}
            </button>
          </div>
        </div>
      </div>

      {/* Booking Status Overlay (Giữ nguyên logic cũ nhưng đẹp hơn) */}
      <AnimatePresence>
        {bookingStatus !== 'IDLE' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-dark/95 backdrop-blur-md p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass p-12 rounded-[40px] max-w-md w-full text-center border-white/10"
            >
              {bookingStatus === 'PROCESSING' && (
                <>
                  <div className="relative w-32 h-32 mx-auto mb-10">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
                    <div className="absolute inset-4 bg-vibrant rounded-full opacity-20 animate-pulse"></div>
                  </div>
                  <h3 className="text-3xl font-bold mb-4">Đang thanh toán...</h3>
                  <p className="text-white/50 leading-relaxed">Chúng tôi đang xử lý giao dịch qua cổng thanh toán giả lập. <br/>Vui lòng chờ trong giây lát.</p>
                </>
              )}

              {bookingStatus === 'SUCCESS' && (
                <>
                  <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                    <CheckCircle2 className="text-green-400" size={64} />
                  </div>
                  <h3 className="text-3xl font-bold mb-2 text-green-400">Thành Công!</h3>
                  <p className="text-white/50 mb-10">Vé của bạn đã được xác nhận. <br/>Hãy kiểm tra email và mục "Vé của tôi".</p>
                  <button 
                    onClick={() => navigate('/my-bookings')}
                    className="w-full bg-vibrant py-4 rounded-2xl font-bold shadow-lg shadow-primary/30"
                  >Xem vé của tôi</button>
                </>
              )}

              {bookingStatus === 'FAILED' && (
                <>
                  <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                    <XCircle className="text-red-400" size={64} />
                  </div>
                  <h3 className="text-3xl font-bold mb-2 text-red-400">Thất Bại</h3>
                  <p className="text-white/50 mb-10">Số dư không đủ hoặc lỗi kết nối ngân hàng (Giả lập). Hãy thử lại nhé!</p>
                  <div className="flex gap-4">
                    <button onClick={() => setBookingStatus('IDLE')} className="flex-1 glass py-4 rounded-2xl font-bold">Thử lại</button>
                    <button onClick={() => navigate('/')} className="flex-1 bg-white/5 py-4 rounded-2xl font-bold">Trang chủ</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingPage;
