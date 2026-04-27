import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Zap, Tag, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { getCoupons, getFilteredDeals } from '../lib/api';
import DealCard from '../components/DealCard';
import { DealCardSkeleton } from '../components/Skeletons';
import FilterDrawer from '../components/FilterDrawer';
import SEO from '../components/SEO';

export default function DealsPage() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState({});
  const filterVersion = useRef(0);

  const fetchDeals = async (filters = {}) => {
    const version = ++filterVersion.current;
    setLoading(true);
    setDeals([]);
    try {
      const hasFilters = Object.keys(filters).length > 0;
      let result;
      if (hasFilters) {
        result = await getFilteredDeals({ ...filters, skip: 0, limit: 50 });
        if (version !== filterVersion.current) return;
        setDeals(Array.isArray(result.deals) ? result.deals : []);
      } else {
        const data = await getCoupons({ limit: 50, page: 1 });
        if (version !== filterVersion.current) return;
        const items = data?.deals || (Array.isArray(data) ? data : []);
        setDeals(items);
      }
    } catch (error) {
      console.error('Failed to fetch deals:', error);
      if (version === filterVersion.current) setDeals([]);
    } finally {
      if (version === filterVersion.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals(activeFilters);
  }, [activeFilters]);

  const handleFilterApply = (filters) => {
    setActiveFilters({ ...filters });
  };

  const activeFilterCount = Object.keys(activeFilters).length;

  return (
    <div className="pb-20 md:pb-8" data-testid="deals-page">
      <SEO
        title="All Deals - Best Coupons & Offers"
        description="Browse all active deals, coupons, and offers from top brands. Find verified discounts updated daily."
        keywords="all deals, coupons, offers, discounts, promo codes"
        url="/deals"
      />

      <section className="bg-gradient-to-br from-orange-50 to-green-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="font-display font-black text-4xl md:text-5xl text-gray-900 mb-4">
              All Deals & Offers
            </h1>
            <p className="text-gray-600 text-lg">
              {loading ? 'Loading deals...' : `${deals.length} verified deals from top brands`}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-6 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-3 overflow-x-auto hide-scrollbar">
            <Link
              to="/deals"
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-[#ee922c] text-white rounded-full font-medium text-sm"
            >
              <Tag className="w-4 h-4" />
              All Deals
            </Link>
            <Link
              to="/deals/limited-time"
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-full font-medium text-sm hover:border-[#ee922c]"
            >
              <Clock className="w-4 h-4" />
              Limited Time
            </Link>
            <Link
              to="/trending"
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-full font-medium text-sm hover:border-[#ee922c]"
            >
              <Zap className="w-4 h-4" />
              Trending
            </Link>
            {activeFilterCount > 0 && (
              <button
                onClick={() => setActiveFilters({})}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-full font-medium text-sm hover:bg-red-100"
                data-testid="clear-filters-btn"
              >
                Clear Filters ({activeFilterCount})
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(12)].map((_, i) => (
                <DealCardSkeleton key={i} />
              ))}
            </div>
          ) : deals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {deals.map((deal, index) => (
                <motion.div
                  key={deal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <DealCard deal={deal} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16" data-testid="no-deals-found">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-semibold">No deals found</p>
              <p className="text-gray-400 mt-1 text-sm">Try adjusting your filters or check back later</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => setActiveFilters({})}
                  className="mt-4 px-6 py-2 bg-[#ee922c] text-white rounded-xl font-medium text-sm hover:bg-[#d9811f] transition-colors"
                  data-testid="reset-filters-btn"
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <FilterDrawer onApply={handleFilterApply} />
    </div>
  );
}
