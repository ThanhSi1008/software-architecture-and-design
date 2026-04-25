import React, { useState, useEffect } from 'react';
import api from '../services/api';
import MovieCard from '../components/MovieCard';
import { Search, Filter, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const HomePage = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await api.get('/movies');
        setMovies(res.data.data);
      } catch (err) {
        console.error('Lỗi khi tải phim:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  const filteredMovies = movies.filter(m => 
    m.title.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-28 pb-20 px-6 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="mb-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border-primary/30 text-primary text-sm font-bold mb-6"
        >
          <Sparkles size={16} />
          <span>Vũ trụ điện ảnh trong tầm tay bạn</span>
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 leading-tight">
          Chọn Phim Hay. <br /> 
          <span className="text-gradient">Trải Nghiệm Tuyệt Vời.</span>
        </h1>
        
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto relative group mt-10">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors" size={24} />
          <input 
            type="text"
            className="w-full glass py-5 pl-16 pr-6 rounded-3xl focus:outline-none border-white/10 focus:border-primary transition-all text-lg"
            placeholder="Tìm kiếm phim bạn yêu thích..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </section>

      {/* Movie Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-primary" size={48} />
          <p className="text-white/50 font-medium">Đang tải danh sách phim...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredMovies.map((movie) => (
            <MovieCard key={movie._id} movie={movie} />
          ))}
          {filteredMovies.length === 0 && (
            <div className="col-span-full text-center py-20 glass rounded-3xl border-dashed">
              <p className="text-white/50 text-xl">Không tìm thấy bộ phim nào phù hợp</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HomePage;
