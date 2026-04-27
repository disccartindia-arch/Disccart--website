import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Zap, ArrowRight, Tag, Clock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getCoupons, getCategories, getHeroConfig } from '../lib/api';
import DealCard from '../components/DealCard';
import CategoryPills from '../components/CategoryPills';
import HeroSlider from '../components/HeroSlider';
import { HomeSEO } from '../components/SEO';
import { DealCardSkeleton, CategoryCardSkeleton } from '../components/Skeletons';
import FilterDrawer from '../components/FilterDrawer';

const DEALS_PER_PAGE = 12;

export default function HomePage() {
  // Independent loading states for each section
  const [featuredDeals, setFeaturedDeals] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  const [trendingDeals, setTrendingDeals] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingPage, setTrendingPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [limitedDeals, setLimitedDeals] = useState([]);
  const [limitedLoading, setLimitedLoading] = useState(true);

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [hero, setHero] = useState(null);
  const [heroLoading, setHeroLoading] = useState(true);

  // Each section loads independently — no blocking
  useEffect(() => {
    // Hero config
    getHeroConfig()
      .then(data => { if (data) setHero(data); })
      .catch(() => {})
      .finally(() => setHeroLoading(false));

    // Categories
    getCategories()
      .then(cats => setCategories(Array.isArray(cats) ? cats : []))
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));

    // Featured deals
    getCoupons({ featured: true, limit: 4, page: 1 })
      .then(data => {
        const items = data?.deals || (Array.isArray(data) ? data : []);
        setFeaturedDeals(items);
      })
      .catch(() => setFeaturedDeals([]))
      .finally(() => setFeaturedLoading(false));

    // Trending deals (main grid)
    getCoupons({ limit: DEALS_PER_PAGE, page: 1 })
      .then(data => {
        const items = data?.deals || (Array.isArray(data) ? data : []);
        setTrendingDeals(items);
        setHasMore(data?.has_more || false);
      })
      .catch(() => setTrendingDeals([]))
      .finally(() => setTrendingLoading(false));

    // Limited time deals
    getCoupons({ offer_type: 'limited', limit: 6, page: 1 })
      .then(data => {
        const items = data?.deals || (Array.isArray(data) ? data : []);
        setLimitedDeals(items.filter(d => (d.offer_type || '').includes('limited')));
      })
      .catch(() => setLimitedDeals([]))
      .finally(() => setLimitedLoading(false));
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = trendingPage + 1;
      const data = await getCoupons({ limit: DEALS_PER_PAGE, page: nextPage });
      const newDeals = data?.deals || (Array.isArray(data) ? data : []);
      setTrendingDeals(prev => [...prev, ...newDeals]);
      setTrendingPage(nextPage);
      setHasMore(data?.has_more || false);
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const categoryImages = {
    'Electronics': 'https://images.unsplash.com/photo-1595284842888-519573d8fb7b?w=400',
    'Fashion': 'https://images.pexels.com/photos/7679655/pexels-photo-7679655.jpeg?w=400',
    'Food & Dining': 'https://images.pexels.com/photos/4440858/pexels-photo-4440858.jpeg?w=400',
    'Travel': 'https://images.pexels.com/photos/8216324/pexels-photo-8216324.jpeg?w=400',
    'Beauty': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
    'Home & Living': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400'
  };

  return (
    <div className="pb-20 md:pb-8" data-testid="home-page">
      <HomeSEO />

      {/* Hero Section — renders immediately with defaults, updates when data arrives */}
      <section className="relative overflow-hidden py-8 md:py-12" style={{ background: hero?.bg_gradient || 'linear-gradient(135deg, #FFF8F0 0%, #F0F9F0 40%, #E8F5E9 65%, #FFF3E0 100%)' }}>
        {(hero?.show_floating_icons !== false) && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-10 -left-10 w-60 h-60 rounded-full bg-green-200/20 blur-3xl hero-float-slow" />
          <div className="absolute top-20 right-10 w-40 h-40 rounded-full bg-orange-200/15 blur-2xl hero-float-medium" />
          <div className="absolute bottom-0 left-1/3 w-52 h-52 rounded-full bg-green-100/20 blur-3xl hero-float-reverse" />
          <div className="absolute -bottom-8 right-1/4 w-36 h-36 rounded-full bg-amber-100/15 blur-2xl hero-float-slow" />
          {(hero?.show_wave !== false) && (
          <svg className="absolute bottom-0 left-0 w-full h-16 text-green-100/30" viewBox="0 0 1440 60" fill="currentColor" preserveAspectRatio="none">
            <path d="M0,30 C360,60 720,0 1080,30 C1260,45 1380,15 1440,30 L1440,60 L0,60 Z" />
          </svg>
          )}
        </div>
        )}

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl tracking-tighter mb-4" style={{ color: hero?.heading_color || '#111827' }}>
              {hero?.heading_line1 || 'Best Deals,'} <span className="gradient-text" style={hero?.accent_color ? { backgroundImage: `linear-gradient(135deg, ${hero.accent_color}, #3c7b48)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : {}}>{hero?.heading_line2 || 'Smart Savings'}</span>
            </h1>
            <p className="text-lg mb-8" style={{ color: hero?.subtext_color || '#4B5563' }}>
              {hero?.subtext || 'Discover verified coupons and exclusive deals from top brands. Save big on every purchase!'}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to={hero?.btn1_link || '/trending'} className="hover:opacity-90 text-white font-bold rounded-xl px-6 py-3 flex items-center gap-2 transition-all shadow-lg" style={{ backgroundColor: hero?.accent_color || '#ee922c', boxShadow: `0 10px 15px -3px ${hero?.accent_color || '#ee922c'}40` }} data-testid="explore-deals-btn">
                <Zap className="w-5 h-5" />
                {hero?.btn1_text || 'Explore Deals'}
              </Link>
              <Link to={hero?.btn2_link || '/categories'} className="border-2 border-gray-200 hover:border-[#ee922c] font-bold rounded-xl px-6 py-3 flex items-center gap-2 transition-colors" style={{ color: hero?.heading_color || '#111827' }} data-testid="view-categories-btn">
                <Tag className="w-5 h-5" />
                {hero?.btn2_text || 'View Categories'}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Hero Slider */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <HeroSlider />
        </div>
      </section>

      {/* Category Pills */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CategoryPills />
        </div>
      </section>

      {/* Featured Deals — loads independently */}
      <section className="py-6" data-testid="featured-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {featuredLoading ? (
            <>
              <div className="flex items-center gap-2 mb-6">
                <Zap className="w-6 h-6 text-[#ee922c]" />
                <h2 className="font-display font-bold text-2xl text-gray-900">Featured Deals</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <DealCardSkeleton key={i} />)}
              </div>
            </>
          ) : featuredDeals.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Zap className="w-6 h-6 text-[#ee922c]" />
                  <h2 className="font-display font-bold text-2xl text-gray-900">Featured Deals</h2>
                </div>
                <Link to="/trending" className="text-[#ee922c] font-medium flex items-center gap-1 hover:gap-2 transition-all">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredDeals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>

      {/* Category Cards — loads independently */}
      <section className="py-8" data-testid="categories-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6">
            <Tag className="w-6 h-6 text-[#3c7b48]" />
            <h2 className="font-display font-bold text-2xl text-gray-900">Shop by Category</h2>
          </div>
          {categoriesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => <CategoryCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/category/${category.slug}`}
                  className="relative aspect-square rounded-2xl overflow-hidden group"
                  data-testid={`category-card-${category.slug}`}
                >
                  <img
                    src={categoryImages[category.name] || category.image_url}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-display font-bold text-lg">{category.name}</h3>
                    <p className="text-sm text-white/80">{category.coupon_count || 0} deals</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Limited Time Offers — loads independently */}
      {(limitedLoading || limitedDeals.length > 0) && (
        <section className="py-8" data-testid="limited-offers-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="bg-red-500 text-white p-1.5 rounded-lg animate-pulse">
                  <Clock className="w-5 h-5" />
                </div>
                <h2 className="font-display font-bold text-2xl text-gray-900">Limited Time Offers</h2>
              </div>
              <Link to="/deals/limited-time" className="text-red-500 font-medium flex items-center gap-1 hover:gap-2 transition-all">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {limitedLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => <DealCardSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {limitedDeals.slice(0, 6).map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Trending Deals with Load More — loads independently */}
      <section className="py-8" data-testid="trending-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#3c7b48]" />
              <h2 className="font-display font-bold text-2xl text-gray-900">Trending Now</h2>
            </div>
            <Link to="/trending" className="text-[#ee922c] font-medium flex items-center gap-1 hover:gap-2 transition-all">
              See All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {trendingLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => <DealCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {trendingDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
          )}

          {!trendingLoading && hasMore && (
            <div className="flex justify-center mt-8" data-testid="load-more-container">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="load-more-btn"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More Deals'
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* SEO Quick Links */}
      <section className="py-8 bg-gray-50" data-testid="seo-links-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display font-bold text-xl text-gray-900 mb-4">Popular Searches</h2>
          <div className="flex flex-wrap gap-2">
            {[
              'amazon-coupons',
              'myntra-sale-today',
              'flipkart-offers',
              'swiggy-coupons',
              'electronics-deals',
              'fashion-sale',
              'best-deals-under-1000'
            ].map((slug) => (
              <Link
                key={slug}
                to={`/deals/${slug}`}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-[#ee922c] hover:text-[#ee922c] transition-colors"
              >
                {slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FilterDrawer onApply={() => {}} />
    </div>
  );
}
