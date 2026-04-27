import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { getCoupons } from '../lib/api';
import DealCard from '../components/DealCard';
import SEO from '../components/SEO';

export default function LimitedDealsPage() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const data = await getCoupons({ limit: 50 });
        const allDeals = data?.deals || (Array.isArray(data) ? data : []);
        const limited = allDeals.filter(d => (d.offer_type || '').includes('limited'));
        setDeals(limited);
      } catch (error) {
        console.error('Failed to fetch deals:', error);
        setDeals([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, []);

  return (
    <div className="pb-20 md:pb-8" data-testid="limited-deals-page">
      <SEO
        title="Limited Time Deals - Expiring Soon!"
        description="Don't miss out! These exclusive deals are expiring soon. Grab them before they're gone."
        keywords="limited time deals, expiring offers, flash sale, urgent discounts"
        url="/deals/limited-time"
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-red-50 to-orange-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full mb-4 animate-pulse">
              <Clock className="w-5 h-5" />
              <span className="font-bold">LIMITED TIME ONLY</span>
            </div>
            <h1 className="font-display font-black text-4xl md:text-5xl text-gray-900 mb-4">
              Limited Time Offers
            </h1>
            <p className="text-gray-600 text-lg">
              Exclusive deals that won't last long — grab them now!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Deals Grid */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-2xl h-96 animate-pulse" />
              ))}
            </div>
          ) : deals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {deals.map((deal, index) => (
                <motion.div
                  key={deal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <DealCard deal={deal} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No limited time deals right now</p>
              <p className="text-gray-400 mt-2">Check back soon for flash sales!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
