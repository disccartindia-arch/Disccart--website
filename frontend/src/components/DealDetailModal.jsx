import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Heart, MessageCircle, Send, Clock, Copy, ExternalLink,
  Tag, TrendingUp, BadgeCheck, ShieldAlert, ShieldX, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { toggleLike, getLikes, addComment, getComments, resolveImageUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ShareButtonsCompact } from './ShareButtons';

function getOrCreateVisitorId() {
  let id = localStorage.getItem('disccart_visitor_id');
  if (!id) {
    id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('disccart_visitor_id', id);
  }
  return id;
}

export default function DealDetailModal({ deal, isOpen, onClose }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);

  const dealId = deal?.id || deal?._id;
  const visitorId = getOrCreateVisitorId();
  const userId = user?.id || visitorId;

  useEffect(() => {
    if (!isOpen || !dealId) return;
    getLikes(dealId, userId).then(d => {
      setLikeCount(d.count || 0);
      setLiked(d.liked || false);
    }).catch(() => {});

    setLoadingComments(true);
    getComments(dealId).then(setComments).catch(() => setComments([])).finally(() => setLoadingComments(false));
  }, [isOpen, dealId, userId]);

  const handleLike = async () => {
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 400);
    try {
      const res = await toggleLike(dealId, userId);
      setLiked(res.liked);
      setLikeCount(res.count);
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!user) {
      toast.error('Please login to comment');
      return;
    }
    setSubmitting(true);
    try {
      const newComment = await addComment(dealId, user.id, user.email?.split('@')[0] || 'User', commentText.trim());
      setComments(prev => [newComment, ...prev]);
      setCommentText('');
      toast.success('Comment added!');
    } catch {
      toast.error('Failed to comment');
    } finally {
      setSubmitting(false);
    }
  };

  const getVerificationBadge = () => {
    const status = deal?.verification_status || (deal?.is_verified ? 'verified' : 'unverified');
    if (status === 'verified') return <div className="flex items-center gap-1 text-[#3c7b48] text-xs font-semibold"><BadgeCheck className="w-4 h-4" /> Verified</div>;
    if (status === 'expired') return <div className="flex items-center gap-1 text-amber-600 text-xs font-semibold"><ShieldAlert className="w-4 h-4" /> Possibly Expired</div>;
    return <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold"><ShieldX className="w-4 h-4" /> Unverified</div>;
  };

  const hasCode = deal?.code && deal.code.trim() !== '';
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (!deal) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[7000] flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="deal-detail-modal"
        >
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Close */}
            <button onClick={onClose} className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center" data-testid="deal-detail-close">
              <X className="w-5 h-5 text-gray-600" />
            </button>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1">
              {/* Image */}
              {deal.image_url && (
                <div className="w-full aspect-[16/9] bg-gray-100">
                  <img src={resolveImageUrl(deal.image_url)} alt={deal.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-5 space-y-4">
                {/* Brand + Category + Verification */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#ee922c] uppercase tracking-wide">{deal.brand_name}</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-xs text-gray-500">{deal.category_name}</span>
                  <span className="text-gray-300">|</span>
                  {getVerificationBadge()}
                </div>

                {/* Title */}
                <h2 className="font-display font-black text-xl sm:text-2xl text-gray-900 leading-tight">
                  {deal.title}
                </h2>

                {/* Description */}
                {deal.description && (
                  <p className="text-gray-500 text-sm leading-relaxed">{deal.description}</p>
                )}

                {/* Price */}
                {deal.discounted_price > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="font-display font-black text-2xl text-[#3c7b48]">
                      ₹{Number(deal.discounted_price).toLocaleString()}
                    </span>
                    {deal.original_price > 0 && (
                      <>
                        <span className="text-gray-400 line-through text-lg">₹{Number(deal.original_price).toLocaleString()}</span>
                        <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg">
                          {Math.round(((deal.original_price - deal.discounted_price) / deal.original_price) * 100)}% OFF
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Code */}
                {hasCode && (
                  <div className="bg-orange-50 border-2 border-dashed border-[#ee922c]/30 rounded-xl p-3 flex items-center justify-between">
                    <code className="font-display font-black text-lg text-[#ee922c] tracking-widest">{deal.code}</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(deal.code);
                        toast.success('Code copied!');
                      }}
                      className="px-4 py-2 bg-[#ee922c] text-white rounded-lg text-sm font-bold flex items-center gap-1"
                    >
                      <Copy className="w-4 h-4" /> Copy
                    </button>
                  </div>
                )}

                {/* Deal Score + Clicks */}
                <div className="flex items-center gap-4 text-sm">
                  {deal.deal_score != null && (
                    <span className={`font-bold ${deal.deal_score >= 70 ? 'text-green-600' : deal.deal_score >= 40 ? 'text-orange-500' : 'text-red-500'}`}>
                      Score: {Math.round(deal.deal_score)}/100
                    </span>
                  )}
                  {deal.clicks > 0 && (
                    <span className="text-gray-400 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> {deal.clicks.toLocaleString()} used
                    </span>
                  )}
                </div>

                {/* CTA */}
                <a
                  href={deal.affiliate_url?.startsWith('http') ? deal.affiliate_url : `https://${deal.affiliate_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-3.5 bg-gradient-to-r from-[#ee922c] to-[#d9811f] text-white font-bold rounded-xl hover:shadow-lg transition-all"
                >
                  {hasCode ? 'Use Coupon Code' : 'Get This Deal'}
                </a>

                {/* Share */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-400">Share this deal</span>
                  <ShareButtonsCompact deal={deal} />
                </div>

                {/* Like & Comment Counts — interactive */}
                <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
                  <button
                    onClick={handleLike}
                    className="flex items-center gap-2 group"
                    data-testid="deal-like-btn"
                  >
                    <motion.div animate={likeAnim ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.3 }}>
                      <Heart
                        className={`w-5 h-5 transition-colors ${liked ? 'text-red-500 fill-red-500' : 'text-gray-400 group-hover:text-red-400'}`}
                      />
                    </motion.div>
                    <span className={`text-sm font-semibold ${liked ? 'text-red-500' : 'text-gray-500'}`}>
                      {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
                    </span>
                  </button>
                  <div className="flex items-center gap-2 text-gray-500">
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm font-semibold">{comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}</span>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="space-y-3">
                  {/* Comment Input — only for logged in users */}
                  {user ? (
                    <form onSubmit={handleComment} className="flex gap-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#ee922c]"
                        maxLength={500}
                        data-testid="comment-input"
                      />
                      <button
                        type="submit"
                        disabled={submitting || !commentText.trim()}
                        className="px-4 py-2.5 bg-[#3c7b48] text-white rounded-xl disabled:opacity-40 flex items-center"
                        data-testid="comment-submit"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </form>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-2">Login to add comments</p>
                  )}

                  {/* Comments list */}
                  {loadingComments ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
                  ) : comments.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {comments.map(c => (
                        <div key={c.id} className="bg-gray-50 rounded-xl px-4 py-3" data-testid={`comment-${c.id}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-gray-700">{c.user_name}</span>
                            <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-600">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-2">No comments yet. Be the first!</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
