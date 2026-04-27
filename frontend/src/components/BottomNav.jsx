import { Link, useLocation } from 'react-router-dom';
import { Home, Grid3X3, TrendingUp, User, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/wishlist', icon: Heart, label: 'Wishlist' },
  { path: '/categories', icon: Grid3X3, label: 'Categories' },
  { path: '/trending', icon: TrendingUp, label: 'Trending' },
  { path: '/profile', icon: User, label: 'Profile' }
];

export default function BottomNav() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-xl border-t border-gray-200 z-50 flex justify-around items-center px-2 pb-safe"
      data-testid="bottom-nav"
    >
      {navItems.map(({ path, icon: Icon, label }) => {
        const isActive = location.pathname === path;
        const actualPath = path === '/profile' && !isAuthenticated ? '/login' : path;
        
        return (
          <Link
            key={path}
            to={actualPath}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${
              isActive ? 'text-[#ee922c]' : 'text-gray-500 hover:text-gray-700'
            }`}
            data-testid={`nav-${label.toLowerCase()}`}
          >
            <Icon className={`w-6 h-6 ${isActive ? 'animate-bounce-subtle' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-xs font-medium ${isActive ? 'font-bold' : ''}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
