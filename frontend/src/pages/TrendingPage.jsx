import { useState, useEffect } from 'react';
import { Flame, Clock } from 'lucide-react';
import { getTrendingDeals } from '../lib/api';
import DealCard from '../components/DealCard';
import CategoryPills from '../components/CategoryPills';
import { motion } from 'framer-motion';
import { TrendingSEO } from '../components/SEO';

export default function TrendingPage() {
  const [deals, setDeals] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getTrendingDeals({ limit: 30 });
        setDeals(Array.isArray(data.deals) ? data.deals : []);
        setTotal(data.total || 0);
      } catch {
        setDeals([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="pb-20 md:pb-8" data-testid="trending-page">
      <TrendingSEO />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CategoryPills />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-8 h-8 text-[#ee922c]" />
            <h1 className="font-display font-bold text-3xl text-gray-900">Trending Deals</h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-gray-500">Hottest deals from the last 24 hours</p>
            <span className="flex items-center gap-1 text-xs font-bold text-[#ee922c] bg-orange-50 px-2 py-1 rounded-full">
              <Clock className="w-3 h-3" /> {total} deals
            </span>
          </div>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-16">
            <Flame className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="text-xl font-bold text-gray-400">No trending deals right now</p>
            <p className="text-sm text-gray-400 mt-1">Check back later — new deals are added daily!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {deals.map((deal, index) => (
              <motion.div key={deal.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
                <DealCard deal={deal} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
