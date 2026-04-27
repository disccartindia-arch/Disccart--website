import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { getWishlist, getWishlistIds } from '../lib/api';
import DealCard from '../components/DealCard';

export default function WishlistPage() {
  const [deals, setDeals] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const getUserId = () => {
    let uid = localStorage.getItem('disccart_user_id');
    if (!uid) {
      uid = 'guest_' + Math.random().toString(36).slice(2);
      localStorage.setItem('disccart_user_id', uid);
    }
    return uid;
  };

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const userId = getUserId();
      const [items, ids] = await Promise.all([
        getWishlist(userId),
        getWishlistIds(userId)
      ]);
      setDeals(Array.isArray(items) ? items : []);
      setWishlistIds(Array.isArray(ids) ? ids : []);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  return (
    <div className="pb-20 md:pb-8" data-testid="wishlist-page">
      <section className="bg-gradient-to-br from-red-50 to-pink-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full mb-4">
              <Heart className="w-5 h-5" fill="currentColor" />
              <span className="font-bold">YOUR WISHLIST</span>
            </div>
            <h1 className="font-display font-black text-4xl md:text-5xl text-gray-900 mb-4">
              Saved Deals
            </h1>
            <p className="text-gray-600 text-lg">
              {deals.length} {deals.length === 1 ? 'deal' : 'deals'} saved for later
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-2xl h-80 animate-pulse" />
              ))}
            </div>
          ) : deals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {deals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  wishlistedIds={wishlistIds}
                  onWishlistChange={fetchWishlist}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Your wishlist is empty</p>
              <p className="text-gray-400 mt-2">Tap the heart icon on any deal to save it here!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
