import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import SmartSearchBar from './SmartSearchBar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-gray-100" data-testid="header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0" data-testid="logo-link">
            <img 
              src="https://customer-assets.emergentagent.com/job_coupon-hub-35/artifacts/3o6cjbcz_IMG_2340.jpeg"
              alt="DISCCART"
              className="h-10 sm:h-11 md:h-12 w-auto object-contain"
              data-testid="logo-icon"
            />
            <span className="font-display font-black text-xl sm:text-2xl md:text-3xl tracking-tight" data-testid="logo-text" style={{
              background: 'linear-gradient(135deg, #3c7b48 0%, #2d9e4b 40%, #ee922c 70%, #e8751a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              DISCCART
            </span>
          </Link>

          {/* Desktop Search */}
          <SmartSearchBar className="hidden md:block flex-1 max-w-xl mx-8" />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            <Link to="/deals" className="text-gray-600 hover:text-[#ee922c] font-medium transition-colors" data-testid="deals-link">
              Deals
            </Link>
            <Link to="/coupons" className="text-gray-600 hover:text-[#ee922c] font-medium transition-colors" data-testid="coupons-link">
              Coupons
            </Link>
            <Link to="/categories" className="text-gray-600 hover:text-[#ee922c] font-medium transition-colors" data-testid="categories-link">
              Categories
            </Link>
            <Link to="/deals/limited-time" className="text-gray-600 hover:text-[#ee922c] font-medium transition-colors" data-testid="limited-link">
              Limited Time
            </Link>
            <Link to="/stores" className="text-gray-600 hover:text-[#ee922c] font-medium transition-colors" data-testid="stores-link">
              Stores
            </Link>
            <Link to="/blog" className="text-gray-600 hover:text-[#ee922c] font-medium transition-colors" data-testid="blog-link">
              Blog
            </Link>
            
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2" data-testid="user-menu-trigger">
                    <User className="w-4 h-4" />
                    <span className="max-w-[100px] truncate">{user?.name || 'Account'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="font-medium">{user?.email}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')} data-testid="admin-link">
                      <Settings className="w-4 h-4 mr-2" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout} data-testid="logout-btn">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button className="bg-[#ee922c] hover:bg-[#d9811f] text-white font-bold rounded-xl px-6" data-testid="login-btn">
                  Login
                </Button>
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-4">
          <SmartSearchBar />
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100" data-testid="mobile-menu">
            <nav className="flex flex-col gap-4">
              <Link 
                to="/deals" 
                className="text-gray-600 hover:text-[#ee922c] font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Deals
              </Link>
              <Link 
                to="/coupons" 
                className="text-gray-600 hover:text-[#ee922c] font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Coupons
              </Link>
              <Link 
                to="/categories" 
                className="text-gray-600 hover:text-[#ee922c] font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Categories
              </Link>
              <Link 
                to="/deals/limited-time" 
                className="text-gray-600 hover:text-[#ee922c] font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Limited Time
              </Link>
              <Link 
                to="/stores" 
                className="text-gray-600 hover:text-[#ee922c] font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Stores
              </Link>
              <Link 
                to="/blog" 
                className="text-gray-600 hover:text-[#ee922c] font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
              </Link>
              {isAuthenticated ? (
                <>
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      className="text-gray-600 hover:text-[#ee922c] font-medium py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Admin Panel
                    </Link>
                  )}
                  <button 
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="text-left text-gray-600 hover:text-[#ee922c] font-medium py-2"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link 
                  to="/login" 
                  className="text-[#ee922c] font-bold py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login / Register
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
