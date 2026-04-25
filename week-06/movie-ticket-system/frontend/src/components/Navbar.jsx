import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Film, User, LogOut, Ticket } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 w-full z-50 glass px-6 py-4 flex justify-between items-center">
      <Link to="/" className="flex items-center gap-2 text-2xl font-bold tracking-tighter">
        <div className="bg-vibrant p-1.5 rounded-lg">
          <Film size={24} className="text-white" />
        </div>
        <span className="text-gradient">MOVIE TICK</span>
      </Link>

      <div className="flex items-center gap-6">
        {user ? (
          <>
            <Link to="/my-bookings" className="flex items-center gap-2 hover:text-primary transition-colors">
              <Ticket size={20} />
              <span>Vé của tôi</span>
            </Link>
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {user.username[0].toUpperCase()}
              </div>
              <span className="font-medium">{user.username}</span>
              <button 
                onClick={() => { logout(); navigate('/login'); }}
                className="p-2 hover:bg-red-500/10 text-red-400 rounded-full transition-all"
              >
                <LogOut size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <Link to="/login" className="px-4 py-2 hover:text-primary transition-colors">Đăng nhập</Link>
            <Link to="/register" className="bg-vibrant px-6 py-2 rounded-full font-bold hover:scale-105 transition-transform">
              Đăng ký
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
