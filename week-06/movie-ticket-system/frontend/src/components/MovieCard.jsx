import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Tag } from 'lucide-react';
import { motion } from 'framer-motion';

const MovieCard = ({ movie }) => {
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SHOWING': return 'bg-green-500/20 text-green-400';
      case 'UPCOMING': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl overflow-hidden group flex flex-col h-full"
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        <img 
          src={movie.posterUrl || `https://via.placeholder.com/400x600?text=${movie.title}`} 
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-4 right-4">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider glass ${getStatusColor(movie.status)}`}>
            {movie.status === 'SHOWING' ? 'Đang chiếu' : movie.status === 'UPCOMING' ? 'Sắp chiếu' : 'Đã kết thúc'}
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-center gap-2 text-xs text-white/50 mb-2">
          <Tag size={12} />
          <span>{movie.genre}</span>
          <span className="mx-1">•</span>
          <Clock size={12} />
          <span>{movie.duration} phút</span>
        </div>
        
        <h3 className="text-xl font-bold mb-3 line-clamp-1">{movie.title}</h3>
        
        <div className="space-y-2 mb-6 flex-grow">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Calendar size={14} className="text-primary" />
            <span>{formatDate(movie.showtime)}</span>
          </div>
          <div className="text-lg font-bold text-gradient">
            {movie.price.toLocaleString('vi-VN')} VNĐ
          </div>
        </div>

        <Link 
          to={`/booking/${movie._id}`}
          className="w-full py-3 rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-vibrant hover:border-transparent transition-all text-center"
        >
          Đặt vé ngay
        </Link>
      </div>
    </motion.div>
  );
};

export default MovieCard;
