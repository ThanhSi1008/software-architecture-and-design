import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Ticket, Calendar, MapPin, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const MyBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await api.get('/bookings');
        setBookings(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'CONFIRMED': return <CheckCircle className="text-green-500" size={20} />;
      case 'FAILED': return <XCircle className="text-red-500" size={20} />;
      default: return <Clock className="text-yellow-500" size={20} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'CONFIRMED': return 'Đã xác nhận';
      case 'FAILED': return 'Thanh toán lỗi';
      default: return 'Đang xử lý';
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-20 px-6 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-12 flex items-center gap-4">
        <Ticket className="text-primary" size={40} />
        Lịch sử đặt vé
      </h1>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={48} /></div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking, index) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              key={booking._id} 
              className="glass p-6 rounded-3xl flex flex-col md:flex-row gap-8 items-center"
            >
              <div className="w-24 h-32 rounded-xl overflow-hidden shrink-0 border border-white/10">
                <img src={booking.posterUrl} className="w-full h-full object-cover" alt={booking.movieTitle} />
              </div>

              <div className="flex-grow space-y-2 text-center md:text-left">
                <h3 className="text-2xl font-bold">{booking.movieTitle}</h3>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-white/50 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={16} className="text-primary" />
                    <span>{new Date(booking.showtime).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={16} className="text-primary" />
                    <span>Rạp 01 - TP. HCM</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 w-full md:w-auto text-center md:text-right space-y-3">
                <div className="flex items-center justify-center md:justify-end gap-2 font-bold text-lg">
                  {getStatusIcon(booking.status)}
                  <span className={booking.status === 'CONFIRMED' ? 'text-green-400' : booking.status === 'FAILED' ? 'text-red-400' : 'text-yellow-400'}>
                    {getStatusText(booking.status)}
                  </span>
                </div>
                <p className="text-xl font-bold text-gradient">{booking.totalPrice.toLocaleString('vi-VN')} VNĐ</p>
                <p className="text-xs text-white/30 uppercase tracking-widest">#{booking._id.slice(-8)}</p>
              </div>
            </motion.div>
          ))}

          {bookings.length === 0 && (
            <div className="text-center py-20 glass rounded-3xl">
              <p className="text-white/50 text-lg mb-6">Bạn chưa có vé nào được đặt.</p>
              <button onClick={() => window.location.href = '/'} className="bg-vibrant px-8 py-3 rounded-2xl font-bold">Đặt ngay</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage;
