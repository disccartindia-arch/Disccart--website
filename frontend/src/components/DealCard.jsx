import { useState, useEffect } from 'react';
import { BadgeCheck, Copy, ExternalLink, Tag, ShieldAlert, ShieldX, TrendingUp, Heart, Clock, MessageCircle, ThumbsUp } from 'lucide-react';
import { motion } from 'framer-motion';
import CouponRevealModal from './CouponRevealModal';
import DealDetailModal from './DealDetailModal';
import { ShareButtonsCompact } from './ShareButtons';
import { resolveImageUrl, addToWishlist, removeFromWishlist, getLikes, getComments } from '../lib/api';
import { toast } from 'sonner';

function DealScoreBadge({ score }) {
  if (!score && score !== 0) return null;
  const rounded = Math.round(score);
  const color = rounded >= 70 ? '#3c7b48' : rounded >= 40 ? '#ee922c' : '#DC2626';
  const bg = rounded >= 70 ? 'bg-green-50 border-green-200' : rounded >= 40 ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200';
  const label = rounded >= 70 ? 'Great' : rounded >= 40 ? 'Good' : 'Fair';
  const circumference = 2 * Math.PI * 16;
  const offset = circumference - (rounded / 100) * circumference;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${bg}`} data-testid="deal-score-badge">
      <svg width="28" height="28" viewBox="0 0 36 36" className="flex-shrink-0">
        <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="16" fill="none"
          stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 18 18)"
        />
        <text x="18" y="18" textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="800" fill={color}>
          {rounded}
        </text>
      </svg>
      <span className="text-xs font-bold" style={{ color }}>{label}</span>
    </div>
  );
}

function VerificationBadge({ status }) {
  if (status === 'verified') {
    return (
      <div className="flex items-center gap-1 text-[#3c7b48] text-xs font-semibold" data-testid="verification-verified">
        <BadgeCheck className="w-4 h-4" />
        <span>Verified</span>
      </div>
    );
  }
  if (status === 'expired') {
    return (
      <div className="flex items-center gap-1 text-amber-600 text-xs font-semibold" data-testid="verification-expired">
        <ShieldAlert className="w-4 h-4" />
        <span>Possibly Expired</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold" data-testid="verification-unverified">
      <ShieldX className="w-4 h-4" />
      <span>Unverified</span>
    </div>
  );
}

export default function DealCard({ deal, wishlistedIds = [], onWishlistChange }) {
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);

  // --- URL & ID FIXES ---
  const dealId = deal.id || deal._id;

  // Wishlist state from parent
  useEffect(() => {
    setIsWishlisted(wishlistedIds.includes(dealId));
  }, [wishlistedIds, dealId]);

  // Fetch like/comment counts
  useEffect(() => {
    if (!dealId) return;
    getLikes(dealId).then(d => setLikeCount(d.count || 0)).catch(() => {});
    getComments(dealId).then(d => setCommentCount(Array.isArray(d) ? d.length : 0)).catch(() => {});
  }, [dealId]);

  // Expiry countdown ticker
  useEffect(() => {
    if (!deal.expires_at) return;
    const update = () => {
      const now = new Date();
      const exp = new Date(deal.expires_at);
      const diff = exp - now;
      if (diff <= 0) { setCountdown('Expired'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setCountdown(`${d}d ${h}h left`);
      else if (h > 0) setCountdown(`${h}h ${m}m left`);
      else setCountdown(`${m}m ${s}s left`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [deal.expires_at]);

  const toggleWishlist = async (e) => {
    e.stopPropagation();
    const userId = localStorage.getItem('disccart_user_id') || 'guest';
    if (!localStorage.getItem('disccart_user_id')) {
      localStorage.setItem('disccart_user_id', 'guest_' + Math.random().toString(36).slice(2));
    }
    const uid = localStorage.getItem('disccart_user_id');
    try {
      if (isWishlisted) {
        await removeFromWishlist(uid, dealId);
        setIsWishlisted(false);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist(uid, dealId);
        setIsWishlisted(true);
        toast.success('Added to wishlist!');
      }
      onWishlistChange?.();
    } catch {
      toast.error('Failed to update wishlist');
    }
  };
  
  // Ensure the affiliate URL is clean for the modal to use
  const sanitizedDeal = {
    ...deal,
    id: dealId,
    affiliate_url: deal.affiliate_url?.startsWith('http') 
      ? deal.affiliate_url 
      : `https://${deal.affiliate_url}`
  };

  const getDiscountDisplay = () => {
    if (deal.discount_type === 'percentage' && deal.discount_value) {
      return `${deal.discount_value}% OFF`;
    } else if (deal.discount_type === 'flat' && deal.discount_value) {
      return `₹${deal.discount_value} OFF`;
    } else if (deal.discount_type === 'deal') {
      return 'DEAL';
    }
    return 'OFFER';
  };

  const hasCode = deal.code && deal.code.trim() !== '';

  return (
    <>
      <motion.div
        className="deal-card bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group p-4"
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        data-testid={`deal-card-${dealId}`}
      >
        {/* Featured Badge */}
        {deal.is_featured && (
          <div className="absolute top-3 left-3 z-10 bg-[#ee922c] text-white text-xs font-bold px-2 py-1 rounded-full">
            FEATURED
          </div>
        )}

        {/* Deal Image */}
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-gray-100">
          {deal.image_url ? (
            <img 
              src={resolveImageUrl(deal.image_url)} 
              alt={deal.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-green-100"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ee922c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg></div>';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-green-100">
              <Tag className="w-12 h-12 text-[#ee922c]" />
            </div>
          )}
          
          {/* Discount Badge */}
          <div className="absolute top-2 right-2 bg-[#3c7b48] text-white font-black text-lg px-3 py-1 rounded-xl font-display shadow-lg">
            {getDiscountDisplay()}
          </div>

          {/* Wishlist Heart */}
          <button
            onClick={toggleWishlist}
            className={`absolute top-2 left-2 p-1.5 rounded-full shadow-md transition-all z-10 ${isWishlisted ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-400 hover:text-red-500'}`}
            data-testid={`wishlist-btn-${dealId}`}
          >
            <Heart className="w-4 h-4" fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Expiry Countdown */}
        {deal.expires_at && countdown && countdown !== 'Expired' && (
          <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-red-50 text-red-600 rounded-lg w-fit text-xs font-bold" data-testid={`countdown-${dealId}`}>
            <Clock className="w-3 h-3 animate-pulse" />
            <span>{countdown}</span>
          </div>
        )}
        {deal.expires_at && countdown === 'Expired' && (
          <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-gray-100 text-gray-500 rounded-lg w-fit text-xs font-bold">
            <Clock className="w-3 h-3" />
            <span>Expired</span>
          </div>
        )}

        {/* Score + Verification Row */}
        <div className="flex items-center justify-between mb-2">
          <DealScoreBadge score={deal.deal_score} />
          <VerificationBadge status={deal.verification_status || (deal.is_verified ? 'verified' : 'unverified')} />
        </div>

        {/* Brand & Category */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-[#ee922c] uppercase tracking-wide">{deal.brand_name}</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-500">{deal.category_name}</span>
        </div>

        {/* Title */}
        <h3 className="font-display font-semibold text-lg text-gray-900 mb-2 line-clamp-2 leading-tight">
          {deal.title}
        </h3>

        {/* Description */}
        {deal.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
            {deal.description}
          </p>
        )}

        {/* Price Display */}
        {deal.discounted_price != null && deal.discounted_price > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <span className="font-display font-black text-xl text-[#3c7b48]">
              ₹{Number(deal.discounted_price).toLocaleString()}
            </span>
            {deal.original_price != null && deal.original_price > 0 && (
              <span className="text-sm text-gray-400 line-through">
                ₹{Number(deal.original_price).toLocaleString()}
              </span>
            )}
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowModal(true);
          }}
          className="mt-auto relative overflow-hidden bg-gradient-to-r from-[#ee922c] to-[#d9811f] text-white font-bold rounded-xl px-6 py-4 w-full group/btn flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-orange-500/25 active:scale-95"
          data-testid={`reveal-btn-${dealId}`}
        >
          {hasCode ? (
            <>
              <Copy className="w-5 h-5" />
              <span>Reveal Code</span>
            </>
          ) : (
            <>
              <ExternalLink className="w-5 h-5" />
              <span>Get Deal</span>
            </>
          )}
        </button>

        {/* Clicks indicator */}
        {deal.clicks > 0 && (
          <div className="mt-2 text-center">
            <span className="text-xs text-gray-400 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" /> {deal.clicks.toLocaleString()} people used this
            </span>
          </div>
        )}

        {/* Like & Comment counts + Share */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <button
              onClick={(e) => { e.stopPropagation(); setShowDetail(true); }}
              className="flex items-center gap-4 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              data-testid={`social-stats-${dealId}`}
            >
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" /> {likeCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" /> {commentCount}
              </span>
            </button>
            <ShareButtonsCompact deal={sanitizedDeal} />
          </div>
        </div>
      </motion.div>

      {/* Reveal Modal */}
      <CouponRevealModal 
        deal={sanitizedDeal} 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />

      {/* Deal Detail Modal with Likes & Comments */}
      <DealDetailModal
        deal={sanitizedDeal}
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false);
          // Refresh counts after modal closes
          getLikes(dealId).then(d => setLikeCount(d.count || 0)).catch(() => {});
          getComments(dealId).then(d => setCommentCount(Array.isArray(d) ? d.length : 0)).catch(() => {});
        }}
      />
    </>
  );
}

export { DealScoreBadge, VerificationBadge };
