import { useState, useEffect, useCallback } from 'react';
import { Search, Ticket, Copy, Check, ExternalLink, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { getCouponsOnly, getCategories } from '../lib/api';
import { DealScoreBadge, VerificationBadge } from '../components/DealCard';
import CouponRevealModal from '../components/CouponRevealModal';
import SEO from '../components/SEO';
import { toast } from 'sonner';
import { CouponCardSkeleton } from '../components/Skeletons';

function CouponCard({ coupon }) {
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      toast.success('Code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = coupon.code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      toast.success('Code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getDiscountDisplay = () => {
    if (coupon.discount_type === 'percentage' && coupon.discount_value) return `${coupon.discount_value}% OFF`;
    if (coupon.discount_type === 'flat' && coupon.discount_value) return `₹${coupon.discount_value} OFF`;
    return 'OFFER';
  };

  const getExpiryText = () => {
    if (!coupon.expires_at) return null;
    const d = new Date(coupon.expires_at);
    const now = new Date();
    if (d < now) return 'Expired';
    const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    if (diff <= 1) return 'Expires today';
    if (diff <= 3) return `Expires in ${diff} days`;
    return `Expires ${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
  };

  const expiry = getExpiryText();

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
        data-testid={`coupon-card-${coupon.id}`}
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-[#ee922c] uppercase tracking-wide">{coupon.brand_name}</span>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-500">{coupon.category_name}</span>
              </div>
              <h3 className="font-display font-semibold text-base text-gray-900 line-clamp-2 leading-tight">
                {coupon.title}
              </h3>
            </div>
            <div className="ml-3 flex-shrink-0 bg-[#3c7b48] text-white font-black text-sm px-3 py-1.5 rounded-xl font-display">
              {getDiscountDisplay()}
            </div>
          </div>

          {coupon.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-3">{coupon.description}</p>
          )}

          {/* Price display */}
          {coupon.discounted_price > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg font-bold text-green-600">₹{coupon.discounted_price}</span>
              {coupon.original_price > 0 && (
                <>
                  <span className="text-sm text-gray-400 line-through">₹{coupon.original_price}</span>
                  <span className="text-xs font-medium text-red-500">
                    ({Math.round(((coupon.original_price - coupon.discounted_price) / coupon.original_price) * 100)}% OFF)
                  </span>
                </>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <DealScoreBadge score={coupon.deal_score} />
            <VerificationBadge status={coupon.verification_status || (coupon.is_verified ? 'verified' : 'unverified')} />
            {expiry && (
              <div className={`flex items-center gap-1 text-xs font-medium ${expiry === 'Expired' ? 'text-red-500' : 'text-gray-400'}`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{expiry}</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-dashed border-gray-200 px-5 py-4 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <div className="bg-white border-2 border-dashed border-[#ee922c]/30 rounded-xl px-4 py-3 text-center">
                <code className="font-display font-black text-xl text-[#ee922c] tracking-widest select-all" data-testid={`coupon-code-${coupon.id}`}>
                  {coupon.code}
                </code>
              </div>
            </div>
            <button
              onClick={copyCode}
              className={`flex-shrink-0 px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                copied
                  ? 'bg-[#3c7b48] text-white'
                  : 'bg-[#ee922c] hover:bg-[#d9811f] text-white'
              }`}
              data-testid={`copy-btn-${coupon.id}`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="mt-3 w-full text-center text-sm text-[#3c7b48] hover:text-[#2d6339] font-semibold flex items-center justify-center gap-1 transition-colors"
            data-testid={`use-coupon-btn-${coupon.id}`}
          >
            <ExternalLink className="w-4 h-4" />
            Use this coupon
          </button>
        </div>
      </motion.div>

      <CouponRevealModal deal={coupon} isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('popular');

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const params = { sort_by: sortBy, limit: 50 };
      if (selectedCategory) params.category = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const data = await getCouponsOnly(params);
      setCoupons(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, [sortBy, selectedCategory, searchQuery]);

  useEffect(() => {
    getCategories().then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCoupons();
  };

  return (
    <div className="pb-20 md:pb-8" data-testid="coupons-page">
      <SEO
        title="Coupon Codes - Verified Promo Codes & Discounts"
        description="Browse verified coupon codes from top brands. Copy and save instantly on your online shopping."
        keywords="coupon codes, promo codes, discount codes, verified coupons, copy coupon"
        url="/coupons"
      />

      <section className="bg-gradient-to-br from-orange-50 via-white to-green-50 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-4 border border-orange-100">
              <Ticket className="w-5 h-5 text-[#ee922c]" />
              <span className="font-medium text-gray-700">Coupon Codes</span>
            </div>
            <h1 className="font-display font-black text-4xl md:text-5xl text-gray-900 mb-4">
              Verified Coupon Codes
            </h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Copy verified promo codes from top brands and save instantly
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-6 border-b border-gray-100 sticky top-16 md:top-20 bg-white/90 backdrop-blur-xl z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            <form onSubmit={handleSearch} className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search coupons, brands..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#ee922c] outline-none"
                  data-testid="coupon-search-input"
                />
              </div>
            </form>

            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setSelectedCategory('')}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  !selectedCategory ? 'bg-[#ee922c] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                data-testid="filter-all"
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === cat.name ? 'bg-[#ee922c] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  data-testid={`filter-${cat.slug}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setSortBy('popular')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  sortBy === 'popular' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                data-testid="sort-popular"
              >
                <TrendingUp className="w-4 h-4" /> Popular
              </button>
              <button
                onClick={() => setSortBy('latest')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  sortBy === 'latest' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                data-testid="sort-latest"
              >
                <Sparkles className="w-4 h-4" /> Latest
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-500 text-sm">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''} found</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <CouponCardSkeleton key={i} />
              ))}
            </div>
          ) : coupons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coupons.map((coupon) => (
                <CouponCard key={coupon.id} coupon={coupon} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No coupons found</p>
              <p className="text-gray-400 mt-1 text-sm">Try changing your filters or search term</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
